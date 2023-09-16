import { describe, beforeEach, it, expect, vi } from "vitest";
import {
  rmSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";

import { join } from "node:path";
import * as core from "@actions/core";

import { run } from "../../src/action.js";
import { withExtractedS3 } from "../../src/download.js";

const env = {
  INPUT_BUCKET: undefined,
  INPUT_KEY: undefined,
  INPUT_DIRECTORY: ".",
  INPUT_FILES: undefined,
  INPUT_FAIL_ON_NOT_FOUND: "false",
};

vi.spyOn(core, "debug").mockImplementation(vi.fn(() => {}));
vi.spyOn(core, "info").mockImplementation(vi.fn(() => {}));
vi.spyOn(core, "notice").mockImplementation(vi.fn(() => {}));
vi.spyOn(core, "warning").mockImplementation(vi.fn(() => {}));
vi.spyOn(core, "error").mockImplementation(vi.fn(() => {}));

vi.mock("../../src/download.js", () => {
  return {
    withExtractedS3: vi.fn<
      Parameters<typeof withExtractedS3>,
      ReturnType<typeof withExtractedS3>
    >(async (client, bucket, key, callback) => {
      let tmpDir: string | undefined;
      let result: Awaited<unknown>;
      try {
        tmpDir = mkdtempSync(join(".", "tmp-zip-"));
        mkdirSync(join(tmpDir, "subdir"));
        mkdirSync(join(tmpDir, "subdir", "subsubdir"));

        writeFileSync(join(tmpDir, "root.txt"), "Welcome root.txt");
        writeFileSync(
          join(tmpDir, "subdir", "subdir.txt"),
          "Welcome in subdir.txt"
        );
        writeFileSync(
          join(tmpDir, "subdir", "subsubdir", "subsubdir.txt"),
          "Welcome in subsubdir.txt"
        );

        result = await Promise.resolve(callback(tmpDir));
      } finally {
        if (tmpDir) {
          rmSync(tmpDir, { force: true, recursive: true });
        }
      }
      return result;
    }),
  };
});

describe("run", () => {
  let dstDir: string;
  beforeEach(() => {
    const oldEnv = { ...process.env };
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }

    dstDir = mkdtempSync(join(".", "tmp-dst-"));

    return () => {
      for (const k of Object.keys(env)) {
        const oldValue = oldEnv[k];
        if (oldValue) {
          process.env[k] = oldValue;
        } else {
          delete process.env[k];
        }
      }

      if (dstDir) {
        rmSync(dstDir, { force: true, recursive: true });
      }
    };
  });

  describe("missing parameters", () => {
    it("should complain when bucket is missing", async () => {
      process.env.INPUT_KEY = "some-key";
      process.env.INPUT_FILES = ["a=10"].join("\n");

      const promise = run();
      await expect(promise).rejects.toThrow(
        "Input required and not supplied: bucket"
      );
    });

    it("should complain when key is missing", async () => {
      process.env.INPUT_BUCKET = "some-bucket";
      process.env.INPUT_FILES = ["a=10"].join("\n");

      const promise = run();
      await expect(promise).rejects.toThrow(
        "Input required and not supplied: key"
      );
    });

    it("should complain when files is missing", async () => {
      process.env.INPUT_BUCKET = "some-bucket";
      process.env.INPUT_KEY = "some-key";

      const promise = run();
      await expect(promise).rejects.toThrow(
        "Input required and not supplied: files"
      );
    });
  });

  it("should copy files", async () => {
    const encoding = "utf8";
    const src1 = join("subdir", "not-found.txt");
    const src2 = join("subdir", "subsubdir", "subsubdir.txt");
    const src3 = join("subdir", "subdir.txt");

    const dst1 = join(dstDir, "not-found.txt");
    const dst2 = join(dstDir, "file1.txt");
    const dst3 = join(dstDir, "bar.txt");

    process.env.INPUT_BUCKET = "some-bucket";
    process.env.INPUT_KEY = "some-key";
    process.env.INPUT_FILES = [
      `${src1}=${dst1}`,
      `${src2}=${dst2}`,
      `${src3}=${dst3}`,
    ].join("\n");

    const result = await run();
    expect(result).toStrictEqual({ copiedFiles: [dst2, dst3] });
    expect(existsSync(dst1)).toBeFalsy();
    expect(readFileSync(dst2, { encoding })).toStrictEqual(
      "Welcome in subsubdir.txt"
    );
    expect(readFileSync(dst3, { encoding })).toStrictEqual(
      "Welcome in subdir.txt"
    );
  });

  it("should treat paths relative to target directory", async () => {
    const src = join("subdir", "subsubdir", "subsubdir.txt");
    const dst = "target.txt";

    process.env.INPUT_BUCKET = "some-bucket";
    process.env.INPUT_KEY = "some-key";
    process.env.INPUT_FILES = `${src}=${dst}`;
    process.env.INPUT_DIRECTORY = dstDir;

    const result = await run();
    expect(result).toStrictEqual({ copiedFiles: [join(dstDir, dst)] });
    expect(readFileSync(join(dstDir, dst), { encoding: "utf8" })).toStrictEqual(
      "Welcome in subsubdir.txt"
    );
  });

  it("should fail on missing file when fail_on_not_found is set", async () => {
    const src = join("subdir", "not-found.txt");
    const dst = join(dstDir, "not-found.txt");

    process.env.INPUT_BUCKET = "some-bucket";
    process.env.INPUT_KEY = "some-key";
    process.env.INPUT_FILES = `${src}=${dst}`;
    process.env.INPUT_FAIL_ON_NOT_FOUND = "true";

    const promise = run();
    await expect(promise).rejects.toThrow(/was not found/);
  });
});

/// <reference types="../vitest.d.ts" />

import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@smithy/util-stream";

import { readFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";

import jszip from "jszip";

import { assertNotNull, readStream } from "./helper.js";
import { s3Stream, unzipStream, withExtractedS3 } from "../../src/download.js";

const s3Mock = mockClient(S3Client);

function fakeZipStream(): Readable {
  const zipRoot = new jszip();
  zipRoot.folder("empty");
  const zipSubDir = zipRoot.folder("subdir");
  assertNotNull(zipSubDir, "Unable to create subdirectory in zipfile");
  const zipSubSubDir = zipSubDir.folder("subsubdir");
  assertNotNull(zipSubSubDir, "Unable to create subdirectory in zipfile");

  zipRoot.file("root.txt", "Welcome from root.txt\n");
  zipSubDir.file("subdir.txt", "Welcome from subdir.txt\n");
  zipSubSubDir.file("subsubdir.txt", "Welcome from subsubdir.txt\n");

  return new Readable().wrap(
    zipRoot.generateNodeStream({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
      streamFiles: false,
    })
  );
}

describe("s3Stream", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it("should return a readable stream", async () => {
    s3Mock
      .on(GetObjectCommand)
      .resolves({ Body: sdkStreamMixin(Readable.from("Hello World")) });

    const client = new S3Client({});
    const stream = await s3Stream(client, "bucket", "key");
    const content = await readStream(stream);

    expect(content).toStrictEqual("Hello World");
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: "bucket",
      Key: "key",
    });
  });

  it("should raise an error when result does not include a body", async () => {
    s3Mock.on(GetObjectCommand).resolves({});

    const client = new S3Client({});
    const promise = s3Stream(client, "bucket", "foo");
    await expect(promise).rejects.toThrow(
      "Unable to read bucket bucket key foo"
    );
  });

  it("should raise an error when body does not include a pipe method", async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: undefined });

    const client = new S3Client({});
    const promise = s3Stream(client, "bucket", "foo");
    await expect(promise).rejects.toThrow(
      "Unable to read bucket bucket key foo"
    );
  });
});

describe("unzipStream", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(".", "tmp-zip-"));
    return () => {
      if (tmpDir) {
        rmSync(tmpDir, { force: true, recursive: true });
      }
    };
  });

  it("should unzip a stream", async () => {
    const stream = fakeZipStream();
    const dir = await unzipStream(stream, tmpDir);

    expect(dir).toStrictEqual(tmpDir);

    const encoding = "utf8";
    const root = readFileSync(join(dir, "root.txt"), { encoding });
    const subdir = readFileSync(join(dir, "subdir", "subdir.txt"), {
      encoding,
    });
    const subsubdir = readFileSync(
      join(dir, "subdir", "subsubdir", "subsubdir.txt"),
      {
        encoding,
      }
    );

    expect(root).toStrictEqual("Welcome from root.txt\n");
    expect(subdir).toStrictEqual("Welcome from subdir.txt\n");
    expect(subsubdir).toStrictEqual("Welcome from subsubdir.txt\n");
  });
});

describe("withExtractedS3", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it("should run callback in context of downloaded directory", async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(fakeZipStream()),
    });

    const client = new S3Client({});

    // We let our callback return the temporary directory to verify it is gone after
    // our function returns
    const tmpDir = await withExtractedS3(
      client,
      "some-bucket",
      "foo.zip",
      async (directory) => {
        const encoding = "utf8";
        const root = readFileSync(join(directory, "root.txt"), { encoding });
        const subdir = readFileSync(join(directory, "subdir", "subdir.txt"), {
          encoding,
        });
        const subsubdir = readFileSync(
          join(directory, "subdir", "subsubdir", "subsubdir.txt"),
          {
            encoding,
          }
        );
        expect(existsSync(directory)).toBeTruthy();
        expect(root).toStrictEqual("Welcome from root.txt\n");
        expect(subdir).toStrictEqual("Welcome from subdir.txt\n");
        expect(subsubdir).toStrictEqual("Welcome from subsubdir.txt\n");
        return directory;
      }
    );
    expect(existsSync(tmpDir)).toBeFalsy();
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: "some-bucket",
      Key: "foo.zip",
    });
  });
});

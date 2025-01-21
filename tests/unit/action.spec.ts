import * as core from '@actions/core';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from '../../src/action.js';
import { withExtractedS3 } from '../../src/download.js';

const env = {
  INPUT_BUCKET: undefined,
  INPUT_DIRECTORIES: undefined,
  INPUT_FAIL_ON_NOT_FOUND: 'false',
  INPUT_FILES: undefined,
  INPUT_KEY: undefined,
  INPUT_SOURCE_BASE_DIRECTORY: '.',
  INPUT_TARGET_BASE_DIRECTORY: '.',
};

vi.spyOn(core, 'debug').mockImplementation(vi.fn(() => {}));
vi.spyOn(core, 'info').mockImplementation(vi.fn(() => {}));
vi.spyOn(core, 'notice').mockImplementation(vi.fn(() => {}));
vi.spyOn(core, 'warning').mockImplementation(vi.fn(() => {}));
vi.spyOn(core, 'error').mockImplementation(vi.fn(() => {}));

vi.mock('../../src/download.js', () => {
  return {
    withExtractedS3: vi.fn<typeof withExtractedS3>(async (_client, _bucket, _key, callback) => {
      let tmpDir: string | undefined;
      let result;
      try {
        tmpDir = mkdtempSync(join('.', 'tmp-zip-'));
        mkdirSync(join(tmpDir, 'subdir'));
        mkdirSync(join(tmpDir, 'subdir', 'subsubdir'));

        writeFileSync(join(tmpDir, 'root.txt'), 'Welcome root.txt');
        writeFileSync(
          join(tmpDir, 'subdir', 'subdir.txt'),
          'Welcome in subdir.txt',
        );
        writeFileSync(
          join(tmpDir, 'subdir', 'subsubdir', 'subsubdir.txt'),
          'Welcome in subsubdir.txt',
        );

        result = await Promise.resolve(callback(tmpDir));
      }
      finally {
        if (tmpDir) {
          rmSync(tmpDir, { force: true, recursive: true });
        }
      }
      return result;
    }),
  };
});

describe('run', () => {
  let dstDir: string;
  beforeEach(() => {
    for (const [k, v] of Object.entries(env)) {
      vi.stubEnv(k, v);
    }

    dstDir = mkdtempSync(join('.', 'tmp-dst-'));

    return () => {
      vi.unstubAllEnvs();
      if (dstDir) {
        rmSync(dstDir, { force: true, recursive: true });
      }
    };
  });

  describe('missing parameters', () => {
    it('complains when bucket is missing', async () => {
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_FILES', ['a=10'].join('\n'));

      const promise = run();
      await expect(promise).rejects.toThrow(
        'Input required and not supplied: bucket',
      );
    });

    it('complains when key is missing', async () => {
      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_FILES', ['a=10'].join('\n'));

      const promise = run();
      await expect(promise).rejects.toThrow(
        'Input required and not supplied: key',
      );
    });
  });

  describe('copy files', () => {
    it('copies files', async () => {
      const encoding = 'utf8';
      const src1 = join('subdir', 'not-found.txt');
      const src2 = join('subdir', 'subsubdir', 'subsubdir.txt');
      const src3 = join('subdir', 'subdir.txt');

      const dst1 = join(dstDir, 'not-found.txt');
      const dst2 = join(dstDir, 'file1.txt');
      const dst3 = join(dstDir, 'bar.txt');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_FILES', [
        `${src1}=${dst1}`,
        `${src2}=${dst2}`,
        `${src3}=${dst3}`,
      ].join('\n'));

      const result = await run();
      expect(result).toStrictEqual({
        copiedDirectories: [],
        copiedFiles: [dst2, dst3],
      });
      expect(existsSync(dst1)).toBeFalsy();
      expect(readFileSync(dst2, { encoding })).toStrictEqual(
        'Welcome in subsubdir.txt',
      );
      expect(readFileSync(dst3, { encoding })).toStrictEqual(
        'Welcome in subdir.txt',
      );
    });

    it('treats paths relative to target directory', async () => {
      const src = join('subdir', 'subsubdir', 'subsubdir.txt');
      const dst = 'target.txt';

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_FILES', `${src}=${dst}`);
      vi.stubEnv('INPUT_TARGET_BASE_DIRECTORY', dstDir);

      const result = await run();
      expect(result).toStrictEqual({
        copiedDirectories: [],
        copiedFiles: [join(dstDir, dst)],
      });
      expect(
        readFileSync(join(dstDir, dst), { encoding: 'utf8' }),
      ).toStrictEqual('Welcome in subsubdir.txt');
    });

    it('sources paths relative to source directory', async () => {
      const src = 'subsubdir.txt';
      const dst = join(dstDir, 'target.txt');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_FILES', `${src}=${dst}`);
      vi.stubEnv('INPUT_SOURCE_BASE_DIRECTORY', join('subdir', 'subsubdir'));

      const result = await run();
      expect(result).toStrictEqual({
        copiedDirectories: [],
        copiedFiles: [dst],
      });
      expect(readFileSync(dst, { encoding: 'utf8' })).toStrictEqual(
        'Welcome in subsubdir.txt',
      );
    });

    it('fails on incorrect assignment', async () => {
      const src = 'subsubdir.txt';
      const dst = join(dstDir, 'target.txt');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_FILES', `${src}:${dst}`);
      vi.stubEnv('INPUT_SOURCE_BASE_DIRECTORY', join('subdir', 'subsubdir'));

      const promise = run();
      await expect(promise).rejects.toThrow(/Unable to split/);
    });

    it('fails on missing file when fail_on_not_found is set', async () => {
      const src = join('subdir', 'not-found.txt');
      const dst = join(dstDir, 'not-found.txt');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_FILES', `${src}=${dst}`);
      vi.stubEnv('INPUT_FAIL_ON_NOT_FOUND', 'true');

      const promise = run();
      await expect(promise).rejects.toThrow(/was not found/);
    });
  });

  describe('copy directories', () => {
    it('copies directories', async () => {
      const encoding = 'utf8';
      const src1 = 'subdir';
      const src2 = 'not-found';
      const dst1 = join(dstDir, 'subdir');
      const dst2 = join(dstDir, 'not-found');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_DIRECTORIES', [
        `${src1}=${dst1}`,
        `${src2}=${dst2}`,
      ].join('\n'));

      const result = await run();
      expect(result).toStrictEqual({
        copiedDirectories: [dst1],
        copiedFiles: [],
      });
      expect(existsSync(dst1)).toBeTruthy();
      expect(
        readFileSync(join(dst1, 'subdir.txt'), { encoding }),
      ).toStrictEqual('Welcome in subdir.txt');
      expect(
        readFileSync(join(dst1, 'subsubdir', 'subsubdir.txt'), { encoding }),
      ).toStrictEqual('Welcome in subsubdir.txt');
      expect(existsSync(dst2)).toBeFalsy();
    });

    it('treats paths relative to target directory', async () => {
      const src = 'subdir';
      const dst = 'targetdir';

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_DIRECTORIES', `${src}=${dst}`);
      vi.stubEnv('INPUT_TARGET_BASE_DIRECTORY', dstDir);

      const result = await run();
      expect(result).toStrictEqual({
        copiedDirectories: [join(dstDir, dst)],
        copiedFiles: [],
      });
      expect(existsSync(join(dstDir, 'targetdir'))).toBeTruthy();
      expect(
        readFileSync(join(dstDir, 'targetdir', 'subdir.txt'), {
          encoding: 'utf8',
        }),
      ).toStrictEqual('Welcome in subdir.txt');
    });

    it('sources paths relative to source directory', async () => {
      const src = 'subsubdir';
      const dst = join(dstDir, 'targetdir');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_DIRECTORIES', `${src}=${dst}`);
      vi.stubEnv('INPUT_SOURCE_BASE_DIRECTORY', 'subdir');

      const result = await run();
      expect(result).toStrictEqual({
        copiedDirectories: [dst],
        copiedFiles: [],
      });
      expect(existsSync(dst)).toBeTruthy();
      expect(
        readFileSync(join(dst, 'subsubdir.txt'), { encoding: 'utf8' }),
      ).toStrictEqual('Welcome in subsubdir.txt');
    });

    it('fails on incorrect assignment', async () => {
      const src = 'subsubdir';
      const dst = join(dstDir, 'targetdir');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_DIRECTORIES', `${src}${dst}`);
      vi.stubEnv('INPUT_SOURCE_BASE_DIRECTORY', 'subdir');

      const promise = run();
      await expect(promise).rejects.toThrow(/Unable to split/);
    });

    it('fails on missing directory when fail_on_not_found is set', async () => {
      const src1 = 'subdir';
      const src2 = 'not-found';
      const dst1 = join(dstDir, 'subdir');
      const dst2 = join(dstDir, 'not-found');

      vi.stubEnv('INPUT_BUCKET', 'some-bucket');
      vi.stubEnv('INPUT_KEY', 'some-key');
      vi.stubEnv('INPUT_DIRECTORIES', [
        `${src1}=${dst1}`,
        `${src2}=${dst2}`,
      ].join('\n'));
      vi.stubEnv('INPUT_FAIL_ON_NOT_FOUND', 'true');

      const promise = run();
      await expect(promise).rejects.toThrow(/was not found/);
    });
  });
});

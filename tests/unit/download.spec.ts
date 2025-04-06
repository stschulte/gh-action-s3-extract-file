import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import jszip from 'jszip';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it } from 'vitest';

import { dumpStream, s3Stream, unzipFile, withExtractedS3 } from '../../src/download.js';
import { assertNotNull, readStream } from './helper.js';

const s3Mock = mockClient(S3Client);

function fakeZipStream(): Readable {
  const zipRoot = new jszip();
  zipRoot.folder('empty');
  const zipSubDir = zipRoot.folder('subdir');
  assertNotNull(zipSubDir, 'Unable to create subdirectory in zipfile');
  const zipSubSubDir = zipSubDir.folder('subsubdir');
  assertNotNull(zipSubSubDir, 'Unable to create subdirectory in zipfile');

  zipRoot.file('root.txt', 'Welcome from root.txt\n');
  zipSubDir.file('subdir.txt', 'Welcome from subdir.txt\n');
  zipSubSubDir.file('subsubdir.txt', 'Welcome from subsubdir.txt\n');

  return new Readable().wrap(
    zipRoot.generateNodeStream({
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
      streamFiles: false,
      type: 'nodebuffer',
    }),
  );
}

describe('dumpStream', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join('.', 'test-dumpstream-'));

    return () => {
      if (tmpDir) {
        rmSync(tmpDir, { force: true, recursive: true });
      }
    };
  });

  it('dumps the stream to a file', async () => {
    const stream = Readable.from('Hello World\n');
    const target = join(tmpDir, 'test.txt');
    const result = await dumpStream(stream, target);
    expect(result).toBe(target);
    expect(readFileSync(result, 'utf8')).toBe('Hello World\n');
  });
});

describe('s3Stream', () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it('returns a readable stream', async () => {
    s3Mock
      .on(GetObjectCommand)
      .resolves({ Body: sdkStreamMixin(Readable.from('Hello World')) });

    const client = new S3Client({});
    const stream = await s3Stream(client, 'bucket', 'key');
    const content = await readStream(stream);

    expect(content).toStrictEqual('Hello World');
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'bucket',
      Key: 'key',
    });
  });

  it('raises an error when result does not include a body', async () => {
    s3Mock.on(GetObjectCommand).resolves({});

    const client = new S3Client({});
    const promise = s3Stream(client, 'bucket', 'foo');
    await expect(promise).rejects.toThrow(
      'Unable to read bucket bucket key foo',
    );
  });

  it('raises an error when body does not include a pipe method', async () => {
    s3Mock
      .on(GetObjectCommand)
      .resolves({ Body: sdkStreamMixin(Readable.toWeb(Readable.from('Hello World'))) });

    const client = new S3Client({});
    const promise = s3Stream(client, 'bucket', 'foo');
    await expect(promise).rejects.toThrow(
      'Unable to read bucket bucket key foo',
    );
  });
});

describe('unzipFile', () => {
  let zipDir: string;
  let targetDir: string;
  beforeEach(() => {
    zipDir = mkdtempSync(join('.', 'test-unzip-file-zipdir-'));
    targetDir = mkdtempSync(join('.', 'test-unzip-file-targetdir-'));

    return () => {
      if (zipDir) {
        rmSync(zipDir, { force: true, recursive: true });
      }
      if (targetDir) {
        rmSync(targetDir, { force: true, recursive: true });
      }
    };
  });

  it('extracts a zipfile to a target directory', async () => {
    const zipFile = await dumpStream(fakeZipStream(), join(zipDir, 'test.zip'));
    const result = await unzipFile(zipFile, targetDir);
    expect(result).toBe(targetDir);

    const encoding = 'utf8';
    const root = readFileSync(join(targetDir, 'root.txt'), { encoding });
    const subdir = readFileSync(join(targetDir, 'subdir', 'subdir.txt'), {
      encoding,
    });
    const subsubdir = readFileSync(
      join(targetDir, 'subdir', 'subsubdir', 'subsubdir.txt'),
      {
        encoding,
      },
    );
    expect(root).toStrictEqual('Welcome from root.txt\n');
    expect(subdir).toStrictEqual('Welcome from subdir.txt\n');
    expect(subsubdir).toStrictEqual('Welcome from subsubdir.txt\n');
  });
});

describe('withExtractedS3', () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it('runs callback in context of downloaded directory', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(fakeZipStream()),
    });

    const client = new S3Client({});

    // We let our callback return the temporary directory to verify it is gone after
    // our function returns
    const tmpDir = await withExtractedS3(
      client,
      'some-bucket',
      'foo.zip',
      (directory) => {
        const encoding = 'utf8';
        const root = readFileSync(join(directory, 'root.txt'), { encoding });
        const subdir = readFileSync(join(directory, 'subdir', 'subdir.txt'), {
          encoding,
        });
        const subsubdir = readFileSync(
          join(directory, 'subdir', 'subsubdir', 'subsubdir.txt'),
          {
            encoding,
          },
        );
        expect(existsSync(directory)).toBeTruthy();
        expect(root).toStrictEqual('Welcome from root.txt\n');
        expect(subdir).toStrictEqual('Welcome from subdir.txt\n');
        expect(subsubdir).toStrictEqual('Welcome from subsubdir.txt\n');
        return directory;
      },
    );
    expect(existsSync(tmpDir)).toBeFalsy();
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'some-bucket',
      Key: 'foo.zip',
    });
  });
});

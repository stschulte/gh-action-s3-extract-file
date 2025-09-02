import type { Entry } from 'yauzl';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import yauzl from 'yauzl';

export async function dumpStream(stream: Readable, path: string): Promise<string> {
  const target = createWriteStream(path);
  return new Promise((resolve, reject) => {
    stream
      .pipe(target)
      .on('close', () => { resolve(path); })
      .on('error', (err) => { reject(err); });
  });
}

export async function s3Stream(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<Readable> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);

  if (response.Body && 'pipe' in response.Body) {
    return response.Body;
  }
  throw new Error(`Unable to read bucket ${bucket} key ${key}`);
}

export async function unzipFile<P extends string>(
  path: string,
  targetDir: P,
): Promise<P> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (err, zipFile) => {
      if (err) {
        reject(err);
      }
      zipFile.readEntry();

      zipFile.on('entry', (entry: Entry) => {
        if (/\/$/.test(entry.fileName)) {
          const directory = join(targetDir, entry.fileName);
          if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
          }
          zipFile.readEntry();
        }
        else {
          const directory = join(targetDir, dirname(entry.fileName));
          if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
          }
          zipFile.openReadStream(entry, (rsError, readStream) => {
            if (rsError) {
              reject(rsError);
            }
            const writeStream = createWriteStream(join(targetDir, entry.fileName));
            readStream
              .pipe(writeStream)
              .on('error', (writeError) => { reject(writeError); })
              .on('close', () => { zipFile.readEntry(); });
          });
        }
      });

      zipFile.on('close', () => {
        resolve(targetDir);
      });
    });
  });
}

export async function withExtractedS3<R>(
  client: S3Client,
  bucket: string,
  key: string,
  callback: (directory: string) => Promise<R> | R,
): Promise<R> {
  const stream = await s3Stream(client, bucket, key);
  return withTmpDir(async (downloadDir) => {
    const zipFile = await dumpStream(stream, join(downloadDir, 'download.zip'));
    return withTmpDir(async (extractDir) => {
      const zipDir = await unzipFile(zipFile, extractDir);
      return Promise.resolve(callback(zipDir));
    });
  });
}

export async function withTmpDir<R>(cb: (directory: string) => Promise<R> | R): Promise<R> {
  let tmpDir: string | undefined;
  try {
    tmpDir = mkdtempSync(join('.', 'gh-action-s3-extract-file'));
    const result = await Promise.resolve(cb(tmpDir));
    return result;
  }
  finally {
    if (tmpDir) {
      rmSync(tmpDir, { force: true, recursive: true });
    }
  }
}

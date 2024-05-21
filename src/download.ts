import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { Extract } from "unzipper";

export async function s3Stream(
  client: S3Client,
  bucket: string,
  key: string
): Promise<Readable> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);

  if (response.Body && "pipe" in response.Body) {
    return response.Body;
  }
  throw new Error(`Unable to read bucket ${bucket} key ${key}`);
}

export async function unzipStream<P extends string>(
  stream: Readable,
  path: P
): Promise<P> {
  return new Promise((resolve, reject) => {
    stream
      .pipe(Extract({ path }))
      .on("close", () => resolve(path))
      .on("error", (err) => reject(err));
  });
}

export async function withExtractedS3<R>(
  client: S3Client,
  bucket: string,
  key: string,
  callback: (directory: string) => Promise<R> | R
): Promise<Awaited<R>> {
  let tmpDir: string | undefined;
  let result: Awaited<R>;
  try {
    tmpDir = mkdtempSync(join(".", "tmp-zip-"));
    const stream = await s3Stream(client, bucket, key);
    const zipDir = await unzipStream(stream, tmpDir);
    result = await Promise.resolve(callback(zipDir));
  } finally {
    if (tmpDir) {
      rmSync(tmpDir, { force: true, recursive: true });
    }
  }
  return result;
}

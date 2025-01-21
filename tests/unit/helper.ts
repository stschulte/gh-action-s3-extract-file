import { Readable } from "node:stream";

export async function readStream(stream: Readable): Promise<string> {
  let result = '';
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: string) => {
      result += chunk;
    });
    stream.on('error', () => {
      reject(new Error('Unable to read test stream'));
    });
    stream.on('end', () => {
      resolve(result);
    });
  });
}

export function assertNotNull<T>(obj: T | null, msg: string): asserts obj is T {
  if (obj === null) {
    throw new Error(msg);
  }
}

import { Readable } from "node:stream";

export async function readStream(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export function assertNotNull<T>(obj: T | null, msg: string): asserts obj is T {
  if (obj === null) {
    throw new Error(msg);
  }
}

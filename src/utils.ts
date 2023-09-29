import { mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

export function copyDirectory(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true });

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, dstPath);
    } else {
      copyFileSync(srcPath, dstPath);
    }
  }
}

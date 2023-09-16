import * as core from "@actions/core";
import { S3Client } from "@aws-sdk/client-s3";
import { withExtractedS3 } from "./download.js";
import { existsSync, copyFileSync } from "fs";
import { join } from "path";

type ActionResult = {
  copiedFiles: string[];
};

export async function run(): Promise<ActionResult> {
  const bucket = core.getInput("bucket", { required: true });
  const key = core.getInput("key", { required: true });
  const targetDirectory = core.getInput("directory");
  const copyFiles = core.getMultilineInput("files", { required: true });
  const failOnNotFound = core.getBooleanInput("fail_on_not_found");

  const s3 = new S3Client({});

  const files = await withExtractedS3(s3, bucket, key, async (directory) => {
    const copied: string[] = [];
    for (const item of copyFiles) {
      const [src, dst] = item.split("=");
      const sourcePath = join(directory, src);
      const destinationPath = join(targetDirectory, dst);
      if (existsSync(sourcePath)) {
        core.info(`Copy ${sourcePath} => ${destinationPath}`);
        copyFileSync(sourcePath, destinationPath);
        copied.push(destinationPath);
      } else {
        core.info(`File ${sourcePath} not found`);
        if (failOnNotFound) {
          throw new Error(
            `The file ${sourcePath} was not found in bucket ${bucket} key ${key}`
          );
        }
      }
    }
    return copied;
  });

  return { copiedFiles: files };
}

import * as core from "@actions/core";
import { S3Client } from "@aws-sdk/client-s3";
import { existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

import { copyDirectory } from "./utils.js";
import { withExtractedS3 } from "./download.js";

type ActionResult = {
  copiedFiles: string[];
  copiedDirectories: string[];
};

export async function run(): Promise<ActionResult> {
  const bucket = core.getInput("bucket", { required: true });
  const key = core.getInput("key", { required: true });
  const baseDirectory = core.getInput("source_base_directory");
  const targetDirectory = core.getInput("target_base_directory");
  const copyFiles = core.getMultilineInput("files", { required: false });
  const copyDirectories = core.getMultilineInput("directories", {
    required: false,
  });
  const failOnNotFound = core.getBooleanInput("fail_on_not_found");

  const s3 = new S3Client({});

  const result = await withExtractedS3(s3, bucket, key, async (directory) => {
    const copiedFiles: string[] = [];
    const copiedDirectories: string[] = [];

    for (const item of copyDirectories) {
      const [src, dst] = item.split("=");
      const sourcePath = join(directory, baseDirectory, src);
      const destinationPath = join(targetDirectory, dst);
      if (existsSync(sourcePath)) {
        core.info(`Copy directory ${sourcePath} => ${destinationPath}`);
        copyDirectory(sourcePath, destinationPath);
        copiedDirectories.push(destinationPath);
      } else {
        core.info(`Directory ${sourcePath} not found`);
        if (failOnNotFound) {
          throw new Error(
            `The directory ${sourcePath} was not found in bucket ${bucket} key ${key}`
          );
        }
      }
    }

    for (const item of copyFiles) {
      const [src, dst] = item.split("=");
      const sourcePath = join(directory, baseDirectory, src);
      const destinationPath = join(targetDirectory, dst);
      if (existsSync(sourcePath)) {
        core.info(`Copy ${sourcePath} => ${destinationPath}`);
        copyFileSync(sourcePath, destinationPath);
        copiedFiles.push(destinationPath);
      } else {
        core.info(`File ${sourcePath} not found`);
        if (failOnNotFound) {
          throw new Error(
            `The file ${sourcePath} was not found in bucket ${bucket} key ${key}`
          );
        }
      }
    }
    return { copiedFiles, copiedDirectories };
  });

  return result;
}

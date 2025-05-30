import { setFailed } from '@actions/core';

import { run } from './action.js';

async function main(): Promise<void> {
  try {
    await run();
  }
  catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) setFailed(error.message);
  }
}

void main();

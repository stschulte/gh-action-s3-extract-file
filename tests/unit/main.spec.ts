import { setFailed } from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from '../../src/action.js';

vi.mock('../../src/action.js', () => {
  return {
    run: vi.fn(),
  };
});

vi.mock('@actions/core', () => {
  return {
    setFailed: vi.fn(),
  };
});

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('runs imported run function on import', async () => {
    await import('../../src/index.js');
    expect(run).toHaveBeenCalledWith();
    expect(setFailed).not.toHaveBeenCalled();
  });

  it('surfaces error message', async () => {
    vi.mocked(run).mockRejectedValue(new Error('Something failed'));
    await import('../../src/index.js');
    expect(run).toHaveBeenCalledWith();
    expect(setFailed).toHaveBeenCalledWith('Something failed');
  });
});

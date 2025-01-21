/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomMatcher } from 'aws-sdk-client-mock-vitest';
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatcher<T> {}
  interface AsymmetricMatchersContaining extends CustomMatcher {}
}

import { CustomMatcher } from "aws-sdk-client-mock-vitest";
import "vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends CustomMatcher<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AsymmetricMatchersContaining extends CustomMatcher {}
}

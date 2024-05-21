import eslint from "@eslint/js";
import gitignore from "eslint-config-flat-gitignore";
import perfectionistNatural from 'eslint-plugin-perfectionist/configs/recommended-natural';
import tseslint from "typescript-eslint";

export default tseslint.config(
  gitignore(),
  {
    ignores: ["dist/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/array-type": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        { "allowExpressions": true }
      ],
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        { "accessibility": "no-public" }
      ],
      "@typescript-eslint/func-call-spacing": ["error", "never"],
      "@typescript-eslint/no-array-constructor": "error",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-extraneous-class": "error",
      "@typescript-eslint/no-for-in-array": "error",
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unnecessary-qualifier": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/prefer-for-of": "warn",
      "@typescript-eslint/prefer-function-type": "warn",
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/restrict-plus-operands": "error",
      "@typescript-eslint/semi": "error",
      "@typescript-eslint/space-before-function-paren": "off",
      "@typescript-eslint/type-annotation-spacing": "error",
      "@typescript-eslint/unbound-method": "error",
      "camelcase": "off",
      "eslint-comments/no-unused-disable": "off",
      "eslint-comments/no-use": "off",
      "i18n-text/no-en": "off",
      "import/no-namespace": "off",
      "no-console": "off",
      "no-unused-vars": "off",
      "semi": "off"
    },
  },
  perfectionistNatural
);

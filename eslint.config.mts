import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  {
    files: ["src/**/*.ts"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: { }
  },
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['src/**/*.ts'],
    extends: [prettier],
  },
  {
    files: ['**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
    },
  }
]);

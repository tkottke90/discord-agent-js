import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  {
    files: ["src/**/*.ts"],
    ignores: ['dist/**/*'],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: { }
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**/*'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**/*'],
    extends: [prettier],
  },
  {
    files: ['**/*.spec.ts'],
    ignores: ['dist/**/*'],
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

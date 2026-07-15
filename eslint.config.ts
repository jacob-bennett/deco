import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tsEslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig(
  { ignores: ["dist/"] },
  eslint.configs.recommended,
  tsEslint.configs.recommended,
  prettier,
  {
    files: ["test/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": false },
      ],
    },
  },
);

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tsEslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig(
  eslint.configs.recommended,
  tsEslint.configs.strict,
  prettier,
);

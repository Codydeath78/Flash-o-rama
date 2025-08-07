import globals from "globals";
import pluginJs from "@eslint/js";

// Trim any problematic global keys
const cleanGlobals = Object.fromEntries(
  Object.entries(globals.browser).map(([key, value]) => [key.trim(), value])
);


/** @type {import('eslint').Linter.Config[]} */
export default [
  {languageOptions: { globals: cleanGlobals }},
  pluginJs.configs.recommended,
];
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The Rules of Hooks stay errors. The React Compiler diagnostics in the recommended preset are
// reported as warnings: the app does not use the compiler, they are hints rather than bugs.
const hookRules = Object.fromEntries(
  Object.keys(reactHooks.configs.flat.recommended.rules).map((rule) => [
    rule,
    rule === 'react-hooks/rules-of-hooks' ? 'error' : 'warn',
  ]),
);

export default defineConfig([
  // Build output, pipeline cache/assets, local experiments, agent worktrees and leftovers of the old v2 app
  globalIgnores(['dist/', 'generated/', '.cache/', 'scratch/', 'app/', 'venv/', '.claude/']),

  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // App (browser)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
    languageOptions: { globals: globals.browser },
    rules: {
      ...hookRules,
      // Only affects hot reloading in development
      'react-refresh/only-export-components': 'warn',
    },
  },

  // Asset pipeline and tooling (Node)
  {
    files: ['pipeline/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
]);

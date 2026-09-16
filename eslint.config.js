const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'supabase/functions/*'],
  },
  {
    // Jest globals. ESLint 9 flat config ignores `/* eslint-env */` comments,
    // so they have to be declared here.
    files: ['jest-setup.js', 'src/**/__tests__/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      // Jest mock factories must use require() — they are hoisted above imports.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // These two rules model React state, and cannot see Reanimated. A
    // SharedValue is mutable by design (`scale.value = withSpring(...)` in an
    // event handler is the documented API), and a 'worklet' function runs on
    // the UI thread rather than during render — so both rules fire on correct
    // code. Genuine render-phase side effects are still caught by review;
    // these were fixed in IncomingPingOverlay and Toast rather than silenced.
    files: ['src/**/*.ts', 'src/**/*.tsx', 'app/**/*.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);

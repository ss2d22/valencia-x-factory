import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/scripts/**'],
    },
    testTimeout: 60000, // XRPL operations can be slow
    hookTimeout: 60000,
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially for XRPL
      },
    },
  },
});

import { defineConfig } from 'vitest/config'

// The HTTP handler uses web APIs that Node provides. Unit tests need no
// Cloudflare runtime or React plugin.
export default defineConfig({
  test: {
    include: [
      'src/**/*.test.{ts,tsx}',
      'worker/**/*.test.ts',
      'tools/build/**/*.test.ts',
      'desktop/src/**/*.test.ts',
      'desktop/renderer/**/*.test.ts',
      'desktop/scripts/**/*.test.ts',
    ],
    environment: 'node',
    globalSetup: ['./worker/test-support/native-global-setup.ts'],
    // A hang guard, not a speed limit (decision 113 B). The slowest Worker
    // harness tests take about 2.5 seconds alone and more when the complete
    // gate runs many files at once. The guard stays at three times that or
    // more, as the testing rules ask.
    testTimeout: 15_000,
  },
})

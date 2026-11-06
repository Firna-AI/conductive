import { defineConfig } from 'vitest/config'

// The HTTP handler uses web APIs that Node provides. Unit tests need no
// Cloudflare runtime or React plugin.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'],
    environment: 'node',
  },
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'renderer/**/*.test.ts'],
    environment: 'node',
  },
})

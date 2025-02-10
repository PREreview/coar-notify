import { Duration } from 'effect'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./test/**/*.test.ts'],
    sequence: {
      concurrent: true,
    },
    testTimeout: Duration.toMillis('30 seconds'),
  },
})

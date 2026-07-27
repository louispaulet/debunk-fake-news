import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.jsonc',
      },
      miniflare: {
        bindings: {
          GROQ_API_KEY: 'test-groq-key',
          TURNSTILE_SECRET: 'test-turnstile-secret',
        },
      },
    }),
  ],
  test: {
    include: ['tests/worker/**/*.test.ts'],
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(''),
    'import.meta.env.VITE_TURNSTILE_SITEKEY': JSON.stringify('test-sitekey'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/frontend/setup.ts'],
    include: ['tests/frontend/**/*.test.tsx'],
    restoreMocks: true,
  },
})

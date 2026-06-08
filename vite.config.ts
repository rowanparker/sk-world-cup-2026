/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/sk-world-cup-2026/ on GitHub Pages,
  // so production builds need the repo name as the base path. Local dev/preview
  // stays at root. (Change this if the repo is renamed or a custom domain is used.)
  base: command === 'build' ? '/sk-world-cup-2026/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
}))

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages etc. often serve under a subpath. Keep build assets relative.
  base: command === 'build' ? './' : '/',
  plugins: [react()],
}))

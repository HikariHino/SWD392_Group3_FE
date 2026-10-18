import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // Both entry directories run the maintained application in the parent folder.
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
})

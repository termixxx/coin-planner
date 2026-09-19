import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // GitHub Pages can publish /docs directly from the main branch.
  // The same folder is also uploaded by our GitHub Actions workflow.
  build: { outDir: 'docs' }
})

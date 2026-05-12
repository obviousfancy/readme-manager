import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cambia 'readme-manager' por el nombre exacto de tu repo en GitHub
export default defineConfig({
  plugins: [react()],
  base: '/readme-manager/',
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.BASE_PATH ?? (
  process.env.GITHUB_ACTIONS === 'true' && repositoryName
    ? `/${repositoryName}/`
    : '/'
)

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/tengxian-3d-dashboard/',
  plugins: [vue()],
})

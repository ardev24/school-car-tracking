import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  // This line is essential and must be correct.
  base: '/school-car-tracking/', 
  plugins: [react()],
})
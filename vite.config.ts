import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // Playwright downloads can be exclusively locked on Windows; they are not app sources.
    watch: { ignored: ['**/artifacts/**', '**/test-results/**', '**/playwright-report/**', '**/.tmp*/**', '**/e2e/**', '**/*.log'] }, // test traces are locked while written (EBUSY crashed the server)
    allowedHosts: ['vizito.in', '.vizito.in', 'localhost']
  },
})


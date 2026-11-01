import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // OpenSheetMusicDisplay alone is about 1.4 MB. It is loaded lazily, only when a
    // score is shown, so the warning about big chunks does not apply to it.
    chunkSizeWarningLimit: 1500,
  },
})

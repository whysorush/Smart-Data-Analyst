import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/smart_data_analyst-master/', // <-- Set this to your repo name
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

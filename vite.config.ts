import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('@xyflow')) return 'reactflow';
              if (id.includes('jspdf') || id.includes('html-to-image')) return 'export';
              if (id.includes('react') || id.includes('react-dom') || id.includes('lucide-react')) return 'vendor';
              if (id.includes('motion') || id.includes('framer-motion')) return 'vendor';
              if (id.includes('clsx') || id.includes('tailwind-merge')) return 'utils';
              return 'vendor';
            }
            if (id.includes('src/components/MindMap')) return 'layout';
            if (id.includes('src/components/ExportCard')) return 'export';
            if (id.includes('src/types')) return 'ai';
            if (id.includes('src/lib/')) return 'utils';
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      // Robustly disable HMR in AI Studio/Cloud Run to avoid WebSocket connection errors
      hmr: (process.env.DISABLE_HMR === 'true' || !!process.env.K_SERVICE) ? false : {
        port: 3000,
        clientPort: 3000,
        overlay: true,
      },
      watch: (process.env.DISABLE_HMR === 'true' || !!process.env.K_SERVICE) ? null : {
        usePolling: true,
      },
    },
  };
});

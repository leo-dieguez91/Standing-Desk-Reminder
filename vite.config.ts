import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        background: 'src/background.ts',
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js'
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('index.html')) {
            return 'popup/index.html'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false
  }
})

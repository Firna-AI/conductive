import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'conducting-react-module-preamble',
      apply: (_config, { command, isPreview }) =>
        command === 'serve' && !isPreview,
      configResolved(config) {
        // main.tsx imports the HMR preamble as a module under script-src 'self'.
        const refresh = config.plugins.find(
          (plugin) => plugin.name === 'vite:react-refresh',
        )
        if (refresh) delete refresh.transformIndexHtml
      },
    },
    cloudflare(),
  ],
})

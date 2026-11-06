import '@vitejs/plugin-react/preamble'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { themeFor, tokensCss } from '../../../docs/mockups/src/theme'
import '../../../docs/mockups/src/render.css'
import { DevHost } from './DevHost'
import { readDevOptions } from './devOptions'

// The dev page takes the Firna theme and the design tokens of the mockups.
// The app shell gives the same to the members UI when Milestone 15i mounts it.
const options = readDevOptions(new URLSearchParams(window.location.search))
const tokens = document.createElement('style')
tokens.textContent = tokensCss(options.scheme)
document.head.append(tokens)
document.documentElement.style.colorScheme = options.scheme

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <SharedUiThemeProvider theme={themeFor(options.scheme)}>
        <DevHost />
      </SharedUiThemeProvider>
    </StrictMode>,
  )
}

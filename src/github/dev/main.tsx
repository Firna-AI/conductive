import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../docs/mockups/src/render.css'
import { DevPage } from './DevPage'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <DevPage />
    </StrictMode>,
  )
}

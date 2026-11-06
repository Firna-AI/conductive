import '../../../docs/mockups/src/render.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToolsDevPage } from './ToolsDevPage'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <ToolsDevPage />
    </StrictMode>,
  )
}

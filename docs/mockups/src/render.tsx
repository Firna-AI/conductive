import type { ReactNode } from 'react'
import type { RenderInput } from '@mokly/mokly'
import { domBackendCss } from '@firna/ui'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { themeFor, themeVariablesCss } from './theme'
import './render.css'

export default function render(input: RenderInput): ReactNode {
  const theme = themeFor(input.colorScheme)
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: domBackendCss }} />
      <style dangerouslySetInnerHTML={{ __html: themeVariablesCss(theme) }} />
      <SharedUiThemeProvider theme={theme}>{input.node}</SharedUiThemeProvider>
    </>
  )
}

import type { ReactNode } from 'react'
import type { RenderInput } from '@mokly/mokly'
import { domBackendCss } from '@firna/ui'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { themeFor, tokensCss } from './theme'
import './render.css'

/** Wraps each screen in the Firna theme and the tokens of its scheme. */
export default function render(input: RenderInput): ReactNode {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: domBackendCss }} />
      <style
        dangerouslySetInnerHTML={{ __html: tokensCss(input.colorScheme) }}
      />
      <SharedUiThemeProvider theme={themeFor(input.colorScheme)}>
        {input.node}
      </SharedUiThemeProvider>
    </>
  )
}

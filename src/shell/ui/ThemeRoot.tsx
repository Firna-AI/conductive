import { useSyncExternalStore, type ReactNode } from 'react'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { ToastProvider } from '@firna/ui/toast'
import { themeFor, tokensCss } from '../../../docs/mockups/src/theme'
import '../../../docs/mockups/src/render.css'

export type ColorScheme = 'light' | 'dark'

/** The design is dark first. A system set to light gets the light scheme. */
const lightQuery = '(prefers-color-scheme: light)'

function subscribe(listener: () => void): () => void {
  const query = window.matchMedia(lightQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function systemScheme(): ColorScheme {
  return window.matchMedia(lightQuery).matches ? 'light' : 'dark'
}

function darkScheme(): ColorScheme {
  return 'dark'
}

/**
 * The Graphite design of the mockups: the Firna theme and the `--ui-*`
 * tokens of the colour scheme of the system, and the toasts of the app.
 */
export function ThemeRoot(props: {
  scheme?: ColorScheme
  children: ReactNode
}) {
  const system = useSyncExternalStore(subscribe, systemScheme, darkScheme)
  const scheme = props.scheme ?? system
  return (
    <>
      {/* The theme provider adds the stylesheet of Firna's controls itself. */}
      <style>{`${tokensCss(scheme)}:root{color-scheme:${scheme}}`}</style>
      <SharedUiThemeProvider theme={themeFor(scheme)}>
        <ToastProvider placement="bottom-right">{props.children}</ToastProvider>
      </SharedUiThemeProvider>
    </>
  )
}

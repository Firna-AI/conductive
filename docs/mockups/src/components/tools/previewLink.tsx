import { createContext, useContext, type ReactNode } from 'react'
import { paths } from '../../paths'

const PreviewPage = createContext<string>(paths.preview)

/**
 * Sets the page that a port of the Preview tool opens, for the screens
 * inside it. The web app shows the open preview in its tab. The phone apps
 * open each preview in the in-app browser.
 */
export function PreviewOpensAt(props: { to: string; children: ReactNode }) {
  return (
    <PreviewPage.Provider value={props.to}>
      {props.children}
    </PreviewPage.Provider>
  )
}

/** The page that a port of the Preview tool opens: by default its tab. */
export function usePreviewPage(): string {
  return useContext(PreviewPage)
}

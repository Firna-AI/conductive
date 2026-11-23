import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { InAppBrowser } from '../components/phone/InAppBrowser'
import { DesktopPicture } from '../components/tools/DesktopView'
import { storefrontPage } from '../entries/components/tools/StorefrontPage.mockup'
import {
  authorizerHost,
  desktopHost,
  previewHost,
} from '../fixtures/inAppBrowser'
import { phonePaths } from '../phonePaths'
import { PreviewOpeningScreen } from './PreviewOpeningScreen'
import styles from './InAppBrowserScreen.module.css'

export const inAppBrowserSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['page'],
  properties: {
    /**
     * The page in the in-app browser: the open preview, the page of the
     * authorizer while the preview opens, the same page when the preview
     * cannot open, or the desktop stream.
     */
    page: { enum: ['preview', 'opening', 'failed', 'desktop'] },
  },
} as const

export type InAppBrowserState = SchemaProps<typeof inAppBrowserSchema>

/** The host in the bar and the page under it, for each state. */
function pageOf(state: InAppBrowserState): { host: string; page: ReactNode } {
  switch (state.page) {
    case 'preview':
      return {
        host: previewHost,
        page: <storefrontPage.Component moklyInstance="storefront-page" />,
      }
    case 'opening':
    case 'failed':
      return {
        host: authorizerHost,
        page: <PreviewOpeningScreen state={{ state: state.page }} />,
      }
    case 'desktop':
      return {
        host: desktopHost,
        page: (
          <div className={styles.stream}>
            <div className={styles.picture}>
              <DesktopPicture />
            </div>
          </div>
        ),
      }
  }
}

/**
 * The in-app browser of the phone apps over the app, with a preview or
 * the desktop stream of a workspace. The page loads with its own one-use
 * grant, as the default browser of the Mac app does, so code in the page
 * never runs with the session of the app. Done shows the app again, at
 * the Preview tool that opened the page.
 */
export function InAppBrowserScreen(props: {
  state: InAppBrowserState
  viewport: Viewport
}) {
  const { host, page } = pageOf(props.state)
  // The app hides Desktop, so the catalogue has no tool for Done to show.
  const desktop = props.state.page === 'desktop'
  return (
    <InAppBrowser
      doneTo={desktop ? undefined : phonePaths.browserTool}
      host={host}
      layout={props.viewport === 'mobile' ? 'phone' : 'tablet'}
    >
      {page}
    </InAppBrowser>
  )
}

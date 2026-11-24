import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { appDomain } from '../../../../src/shared/brand'
import { AppLegalPage } from '../components/phone/AppLegalPage'
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
     * cannot open, the desktop stream, or Terms or Privacy on the app host.
     */
    page: {
      enum: ['preview', 'opening', 'failed', 'desktop', 'terms', 'privacy'],
    },
  },
} as const

export type InAppBrowserState = SchemaProps<typeof inAppBrowserSchema>

/**
 * A page of the in-app browser: the host in the bar, the content under the
 * bar, and the screen of the app that Done shows again.
 */
type BrowserPage = {
  host: string
  content: ReactNode
  doneTo: string | undefined
}

/** The page of the in-app browser for each state. */
function pageOf(state: InAppBrowserState, viewport: Viewport): BrowserPage {
  switch (state.page) {
    case 'preview':
      return {
        host: previewHost,
        content: <storefrontPage.Component moklyInstance="storefront-page" />,
        doneTo: phonePaths.browserTool,
      }
    case 'opening':
    case 'failed':
      return {
        host: authorizerHost,
        content: <PreviewOpeningScreen state={{ state: state.page }} />,
        doneTo: phonePaths.browserTool,
      }
    case 'desktop':
      return {
        host: desktopHost,
        content: (
          <div className={styles.stream}>
            <div className={styles.picture}>
              <DesktopPicture />
            </div>
          </div>
        ),
        // The app hides Desktop, so the catalogue has no tool for Done.
        doneTo: undefined,
      }
    case 'terms':
    case 'privacy':
      return {
        host: appDomain,
        content: <AppLegalPage page={state.page} viewport={viewport} />,
        doneTo: phonePaths.signIn,
      }
  }
}

/**
 * The in-app browser of the phone apps over the app. A preview or the
 * desktop stream of a workspace loads with its own one-use grant, as in
 * the default browser of the Mac app, so code in the page never runs with
 * the session of the app. Terms and Privacy show on the app host. Done
 * shows the app again: the Preview tool that opened a preview, or the
 * sign-in that opened a legal page.
 */
export function InAppBrowserScreen(props: {
  state: InAppBrowserState
  viewport: Viewport
}) {
  const { host, content, doneTo } = pageOf(props.state, props.viewport)
  return (
    <InAppBrowser
      doneTo={doneTo}
      host={host}
      layout={props.viewport === 'mobile' ? 'phone' : 'tablet'}
    >
      {content}
    </InAppBrowser>
  )
}

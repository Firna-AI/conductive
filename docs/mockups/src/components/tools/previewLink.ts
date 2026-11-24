import { usePhoneApp } from '../phone/PhoneApp'
import { paths } from '../../paths'
import { phonePaths } from '../../phonePaths'

/**
 * The page that a press on a port of the Preview tool opens. The web app
 * shows the open preview in its Preview tab. The phone apps open each
 * preview in the in-app browser, which shows the page of the authorizer
 * first, so every port opens that page.
 */
const previewPages = {
  web: paths.preview,
  phone: phonePaths.browserOpening,
} as const

/** The page that a port of the Preview tool opens, in the app of the screen. */
export function usePreviewPage(): string {
  return usePhoneApp() ? previewPages.phone : previewPages.web
}

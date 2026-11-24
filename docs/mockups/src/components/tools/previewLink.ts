import { paths } from '../../paths'
import { phonePaths } from '../../phonePaths'

/**
 * The page that a press on a port of the Preview tool opens. The web app
 * shows the open preview in its Preview tab, which each part of the tool
 * opens by default. The phone apps open each preview in the in-app
 * browser, which shows the page of the authorizer first, so every port
 * opens that page. A screen of the phone apps passes it as data.
 */
export const previewPages = {
  web: paths.preview,
  phone: phonePaths.browserOpening,
} as const

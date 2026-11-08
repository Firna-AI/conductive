import { previewPath } from '../../../../src/shared/previews'
import { appDomain } from '../brand'
import { orgs } from './orgs'
import { checkoutAutocomplete } from './workspaces'

/**
 * The port previews of the open workspace. The API gives each preview a
 * launch address on the app's hostname, never its private preview host.
 * The screens show the port, not the address.
 */

export const openPort = 3000

/** The launch address of the open preview, which a new tab opens. */
export const previewUrl = new URL(
  previewPath(orgs.acme.key, checkoutAutocomplete.key, 'preview-1'),
  `https://${appDomain}`,
).href

/** What the user types into the address field of the previewed shop. */
export const addressQuery = '221B Baker St'

export const addressSuggestions = [
  '221B Baker Street, London NW1 6XE',
  '221B Baker Street, Bristol BS1 4QA',
  '221 Baker Road, Leeds LS6 2AA',
] as const

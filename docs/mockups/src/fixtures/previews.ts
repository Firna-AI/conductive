/**
 * The port previews of the open workspace. A preview address is a random
 * hostname, so the screens show the port, not the address.
 */

export const openPort = 3000

export const previewUrl = 'https://k7q2m9x4p8w3zr5t.acme-previews.dev/checkout'

/** What the user types into the address field of the previewed shop. */
export const addressQuery = '221B Baker St'

export const addressSuggestions = [
  '221B Baker Street, London NW1 6XE',
  '221B Baker Street, Bristol BS1 4QA',
  '221 Baker Road, Leeds LS6 2AA',
] as const

import {
  SITE_MARKERS,
  type SiteRequestValues,
} from '../../src/shared/site-build'

const entities: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const markerPattern = new RegExp(Object.values(SITE_MARKERS).join('|'), 'g')

/** Replace once, so a value cannot introduce another marker or a pattern. */
export function fillMarkers(
  page: string,
  values: Partial<SiteRequestValues>,
): string {
  const replacements = new Map<string, string>()
  for (const [key, marker] of Object.entries(SITE_MARKERS)) {
    const value = Object.entries(values).find(([name]) => name === key)?.[1]
    if (value === undefined) continue
    if (!page.includes(marker)) throw new Error('Missing site marker.')
    replacements.set(
      marker,
      value.replace(/[&<>"']/g, (character) => entities[character]),
    )
  }
  return page.replace(
    markerPattern,
    (marker) => replacements.get(marker) ?? marker,
  )
}

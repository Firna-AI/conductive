import type { BaseImage } from '../../shared/base-image'

/** A list in words: "a", "a and b", or "a, b, and c". */
function listed(items: readonly string[]): string {
  if (items.length <= 2) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

/**
 * The software of the base image of every cloud computer, as one sentence:
 * "Cloud computers run Ubuntu 24.04 and include Node.js 24, npm, and gh."
 * The API sends the list with the settings. An older reply has none, and
 * then the tab names no software.
 */
export function softwareSentence(image: BaseImage | undefined): string | null {
  if (!image) return null
  if (image.software.length === 0) {
    return `Cloud computers run ${image.operatingSystem}.`
  }
  return `Cloud computers run ${image.operatingSystem} and include ${listed(image.software)}.`
}

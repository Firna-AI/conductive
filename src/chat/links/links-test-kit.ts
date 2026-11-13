import { parseRoute } from '../../app/router'
import { webLink, type WebLink } from '../../markdown/web-links'
import { FAKE_ORIGIN } from '../../test-support/fixtures/core'
import type { ChatPart } from './chat-parts'

// The helpers of the tests of the links of chat text.

/** The app origin of the tests, with the check of the router for a page. */
export const appLinks = {
  appOrigin: FAKE_ORIGIN,
  isAppPage: (url: URL) =>
    parseRoute(url.pathname, url.search).screen !== 'not-found',
}

/** Where an address leads in the chat of a workspace whose servers run. */
export const webLinkOf = (href: string): WebLink | undefined =>
  webLink(href, appLinks)

/**
 * A part in a short form: text, code with the kind of its link, the ID and
 * page of a chip, a link as its kind and its words, or a file.
 */
export function shapeOf(part: ChatPart) {
  switch (part.kind) {
    case 'chip':
      return { chip: part.target.workspace.id, to: part.target.to }
    case 'attachment':
      return { attachment: part.attachment.id, path: part.path }
    case 'file':
      return { file: part.entry.path }
    case 'link':
      return {
        [part.link.kind]: part.words.map((word) => word.text).join(''),
        ...(part.strong ? { strong: true } : {}),
      }
    case 'code':
      return part.link
        ? { code: part.text, link: part.link.kind }
        : { code: part.text }
    case 'text':
      return part.strong
        ? { text: part.text, strong: true }
        : { text: part.text }
  }
}

import type { ReactNode } from 'react'
import type { CodePart } from '../../../../../src/chat/links/link-parts'
import {
  labelHidesAddress,
  type WebLink,
} from '../../../../../src/markdown/web-links'
import { openPort } from '../../fixtures/previews'
import { paths } from '../../paths'
import inline from '../../../../../src/ui/components/common/InlineText.module.css'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import {
  TextLink,
  type LinkOpener,
} from '../../../../../src/ui/components/common/TextLink'
import { useChatWorkspaces } from './chatWorkspaces'
import { linkPage, linkTarget, webLinkOf } from './workspaceLinks'

/**
 * A Markdown image of the Markdown preview of a file, such as a picture at
 * a web address. No picture loads: it shows its alt text, as a link when
 * its target is a web address (item 10 B of the Markdown plan).
 */
export type ImagePart = {
  kind: 'image'
  alt: string
  href: string
  source: string
}

/**
 * The screen of each port whose preview the mockups draw: the dev server
 * of the open workspace.
 */
const portScreens: ReadonlyMap<number, string> = new Map([
  [openPort, paths.preview],
])

/**
 * An anchor that opens a page outside the app in a new tab, with no opener
 * and no referrer, so the page gets no address of the app.
 */
export function NewTabAnchor(props: LinkOpener & { href: string }) {
  const { href, ...link } = props
  return (
    <a
      {...link}
      href={useOutsideHref(href)}
      rel="noopener noreferrer"
      target="_blank"
    />
  )
}

/**
 * The screen that a press on a link of the app or on a local address opens
 * in the mockups: the page that an app link names, or the port preview of
 * a local address. A link to a page that the mockups do not draw has none.
 */
function useScreen(link: WebLink): string | undefined {
  const links = useChatWorkspaces()
  if (link.kind === 'local') return portScreens.get(link.port)
  if (link.kind === 'web') return undefined
  const target = linkTarget(link.url.href, links)
  return target ? linkPage(target) : undefined
}

/** The element that opens a web link, as `TextLink` takes it. */
function openerOf(link: WebLink, to: string | undefined) {
  if (link.kind === 'web') {
    return (anchor: LinkOpener) => (
      <NewTabAnchor {...anchor} href={link.url.href} />
    )
  }
  if (to === undefined) return undefined
  return (anchor: LinkOpener) => <ScreenLink {...anchor} to={to} />
}

/**
 * A web link of chat text, with the look of `TextLink`, and its words. A
 * press on a link of the app opens its page in the app, in the same window,
 * as a chip does. A press on a local address opens the port preview of its
 * port, in the workspace of the chat. A press on any other link opens a new
 * tab. The mockups open the screen of an app page or of a port preview when
 * they draw it.
 */
export function WebLinkText(props: { link: WebLink; children: ReactNode }) {
  const { link } = props
  const to = useScreen(link)
  return (
    <TextLink address={link.url} opener={openerOf(link, to)}>
      {props.children}
    </TextLink>
  )
}

/**
 * A Markdown image of the file preview. No picture loads from a web
 * address, so the image shows its alt text as a link to its address, with
 * the rules of a Markdown link: alt text that reads as an address, or that
 * shows nothing, shows the address in its place. An image with no valid
 * address shows its alt text only.
 */
export function WebImagePart(props: { part: ImagePart }) {
  const { alt, href } = props.part
  const link = webLinkOf(href)
  if (!link) return alt
  return (
    <WebLinkText link={link}>{labelHidesAddress(alt) ? href : alt}</WebLinkText>
  )
}

/**
 * Inline code in its code box. When its text, without the spaces at its
 * ends, is one web address that is a link, the address is a link inside
 * the box. The address of a workspace is such a link too, not a chip, so
 * the code keeps its text.
 */
export function CodeText(props: { part: CodePart }) {
  const { text, link } = props.part
  if (!link) return <code className={inline.code}>{text}</code>
  const address = text.trim()
  const start = text.indexOf(address)
  return (
    <code className={inline.code}>
      {text.slice(0, start)}
      <WebLinkText link={link}>{address}</WebLinkText>
      {text.slice(start + address.length)}
    </code>
  )
}

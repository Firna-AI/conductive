import type { ReactNode } from 'react'
import {
  readsAsAddress,
  webAddressParts,
  webLink,
  type WebAddressLink,
  type WebLink,
} from '../../../../../src/markdown/web-links'
import { openPort } from '../../fixtures/previews'
import { paths } from '../../paths'
import inline from '../common/InlineText.module.css'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import { TextLink, type LinkOpener } from '../common/TextLink'
import { useChatWorkspaces } from './chatWorkspaces'
import { linkContext, linkPage, linkTarget } from './workspaceLinks'

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
function NewTabAnchor(props: LinkOpener & { href: string }) {
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
  const rows = useChatWorkspaces()
  if (link.kind === 'local') return portScreens.get(link.port)
  if (link.kind === 'web') return undefined
  const target = linkTarget(link.url.href, rows)
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
 * A web link of chat text, with the look of `TextLink`. A press on a link
 * of the app opens its page in the app, in the same window, as a chip
 * does. A press on a local address opens the port preview of its port, in
 * the workspace of the chat. A press on any other link opens a new tab.
 * The mockups open the screen of an app page or of a port preview when
 * they draw it.
 */
function WebLinkText(props: { link: WebLink; children: ReactNode }) {
  const { link } = props
  const to = useScreen(link)
  return (
    <TextLink address={link.url} opener={openerOf(link, to)}>
      {props.children}
    </TextLink>
  )
}

/**
 * Text as typed, such as a Markdown link of a sent message: each bare
 * address in it is a link, and the rest is text.
 */
function TypedText(props: { text: string }) {
  return webAddressParts(props.text, false).map((part, index) =>
    part.kind === 'text' ? (
      part.text
    ) : (
      <WebLinkPart answer={false} key={index} part={part} />
    ),
  )
}

/**
 * A link of chat text that names no workspace of the org. A bare address
 * shows as the text has it. In an answer, a Markdown link shows as its
 * label, or as its address when the label reads as an address, and its
 * title gives the address. In a message of a member, a Markdown link shows
 * as typed, and its address is the link. An address that is no link, such
 * as one with a user name, shows as typed.
 */
export function WebLinkPart(props: { part: WebAddressLink; answer: boolean }) {
  const { href, source, label } = props.part
  const link = webLink(href, linkContext)
  if (label === undefined) {
    return link ? <WebLinkText link={link}>{source}</WebLinkText> : source
  }
  if (!link || !props.answer) return <TypedText text={source} />
  const shown = readsAsAddress(label) ? href : label
  return <WebLinkText link={link}>{shown}</WebLinkText>
}

/**
 * Inline code in its code box. When its text, without the spaces at its
 * ends, is one web address that is a link, the address is a link inside
 * the box. The address of a workspace is such a link too, not a chip, so
 * the code keeps its text.
 */
export function CodeText(props: { text: string; href?: string }) {
  const { text, href } = props
  const link = href === undefined ? undefined : webLink(href, linkContext)
  if (href === undefined || !link) {
    return <code className={inline.code}>{text}</code>
  }
  const start = text.indexOf(href)
  return (
    <code className={inline.code}>
      {text.slice(0, start)}
      <WebLinkText link={link}>{href}</WebLinkText>
      {text.slice(start + href.length)}
    </code>
  )
}

import type { ReactNode } from 'react'
import inline from '../../ui/components/common/InlineText.module.css'
import { TextLink } from '../../ui/components/common/TextLink'
import type { WebLink } from '../../markdown/web-links'
import { useTextLinks } from '../../shell/ui/text-links'
import type { CodePart, LinkPart } from './link-parts'

/**
 * A web link of chat text, with the look of `TextLink`, through the opener
 * of the screen. Its title gives the whole address. In the plain mode,
 * such as in the hidden copy of a message line, it draws its words alone.
 */
export function ChatWebLink(props: { link: WebLink; children: ReactNode }) {
  const { opener } = useTextLinks()
  if (!opener) return props.children
  return (
    <TextLink address={props.link.url} opener={opener(props.link)}>
      {props.children}
    </TextLink>
  )
}

/** A web address of a sent message that is no chip, as the text has it. */
export function WebLinkText(props: { part: LinkPart }) {
  return <ChatWebLink link={props.part.link}>{props.part.text}</ChatWebLink>
}

/**
 * Inline code in its code box. Code that holds one web address alone, with
 * the spaces at its ends, shows the address as a link inside the box.
 */
export function CodeText(props: { part: CodePart }) {
  const { text, link } = props.part
  if (!link) return <code className={inline.code}>{text}</code>
  const address = text.trim()
  const start = text.indexOf(address)
  return (
    <code className={inline.code}>
      {text.slice(0, start)}
      <ChatWebLink link={link}>{address}</ChatWebLink>
      {text.slice(start + address.length)}
    </code>
  )
}

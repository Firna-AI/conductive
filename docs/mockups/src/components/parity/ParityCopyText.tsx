import { Fragment } from 'react'
import type { CopyText } from '../../../../../src/marketing/from-conductor/copy'
import { dayWords } from '../../../../../src/marketing/from-conductor/dates'
import { useOutsideHref } from '../common/ScreenLink'

/** A link to a page of another site. A picture of a page has no address. */
function OutsideLink(props: { href: string; text: string; className: string }) {
  const href = useOutsideHref(props.href)
  return (
    <a className={props.className} href={href}>
      {props.text}
    </a>
  )
}

/**
 * A sentence of the page from the shared copy: its words, its links to
 * other sites, and its days as `time` elements with their full words.
 */
export function ParityCopyText(props: {
  text: CopyText
  linkClassName: string
}) {
  return props.text.map((part, index) => {
    if (typeof part === 'string') return <Fragment key={index}>{part}</Fragment>
    if ('day' in part) {
      return (
        <time dateTime={part.day} key={index}>
          {dayWords(part.day, 'long')}
        </time>
      )
    }
    return (
      <OutsideLink
        className={props.linkClassName}
        href={part.href}
        key={index}
        text={part.text}
      />
    )
  })
}

import { lockup } from '../../entries/components/brand/Logo.mockup'
import { defined } from '../../defined'
import { ScreenLink } from '../common/ScreenLink'
import styles from '../../../../../src/ui/components/marketing/Wordmark.module.css'

/**
 * The lockup of the product: the tile and the name, in the version of the
 * colour scheme. With `to` it links to that page, such as the home page of
 * the site. `height` sets a smaller lockup, such as in a top bar.
 */
export function Wordmark(props: {
  to?: string
  height?: number
  /** The place of the lockup, which names it for Mokly. */
  place: 'header' | 'footer' | 'sign-in'
}) {
  const content = (
    <lockup.Component
      moklyInstance={`${props.place}-lockup`}
      {...defined({ height: props.height })}
    />
  )
  if (!props.to) return <span className={styles.wordmark}>{content}</span>
  return (
    <ScreenLink className={styles.wordmark} to={props.to}>
      {content}
    </ScreenLink>
  )
}

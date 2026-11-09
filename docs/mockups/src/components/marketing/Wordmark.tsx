import { Lockup } from '../brand/Logo'
import { ScreenLink } from '../common/ScreenLink'
import styles from './Wordmark.module.css'

/**
 * The lockup of the product: the tile and the name, in the version of the
 * colour scheme. With `to` it links to that page, such as the home page of
 * the site. `height` sets a smaller lockup, such as in a top bar.
 */
export function Wordmark(props: { to?: string; height?: number }) {
  const content = <Lockup height={props.height ?? 30} />
  if (!props.to) return <span className={styles.wordmark}>{content}</span>
  return (
    <ScreenLink className={styles.wordmark} to={props.to}>
      {content}
    </ScreenLink>
  )
}

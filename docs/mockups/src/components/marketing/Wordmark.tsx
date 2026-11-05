import { productName } from '../../brand'
import { Mark } from '../common/Mark'
import { ScreenLink } from '../common/ScreenLink'
import styles from './Wordmark.module.css'

/**
 * The mark and the working name of the product. With `to` it links to that
 * page, such as the home page of the site.
 */
export function Wordmark(props: { to?: string }) {
  const content = (
    <>
      <Mark />
      <span className={styles.name}>{productName}</span>
    </>
  )
  if (!props.to) return <span className={styles.wordmark}>{content}</span>
  return (
    <ScreenLink className={styles.wordmark} to={props.to}>
      {content}
    </ScreenLink>
  )
}

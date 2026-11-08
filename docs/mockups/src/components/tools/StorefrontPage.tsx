import { addressQuery, addressSuggestions } from '../../fixtures/previews'
import styles from './StorefrontPage.module.css'

/**
 * The checkout page of the user's shop, as the dev server serves it. The
 * compact size fits the browser window of the desktop view.
 */
export function StorefrontPage(props: { compact?: boolean }) {
  return (
    <div
      className={
        props.compact ? `${styles.page} ${styles.compact}` : styles.page
      }
    >
      <div className={styles.nav}>
        <span className={styles.logo}>ACME</span>
        <span className={styles.cart}>Cart (2)</span>
      </div>
      <div className={styles.body}>
        <h1 className={styles.title}>Checkout</h1>
        <div className={styles.label}>Address</div>
        <div className={`${styles.field} ${styles.focused}`}>
          {addressQuery}
        </div>
        <ul className={styles.suggestions}>
          {addressSuggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
        <div className={styles.row}>
          <div className={styles.label}>City</div>
          <div className={styles.label}>Postcode</div>
          <div className={styles.field}>City</div>
          <div className={styles.field}>Postcode</div>
        </div>
        <div className={styles.button}>Continue to payment</div>
      </div>
    </div>
  )
}

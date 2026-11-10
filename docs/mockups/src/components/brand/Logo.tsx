import { productName } from '../../brand'
import styles from './Logo.module.css'

/**
 * The tile of the app icon, where the logo stands alone, such as at the top
 * of the org rail. `size` is the side of the tile, in px.
 */
export function LogoTile(props: { size: number }) {
  return (
    <span
      aria-hidden
      className={styles.tile}
      style={{ width: props.size, height: props.size }}
    />
  )
}

/**
 * The macOS app icon of the Mac app, with its canvas and shadow, as in a
 * notification. `size` is the side of the canvas, in px.
 */
export function MacAppIcon(props: { size: number }) {
  return (
    <span
      aria-hidden
      className={styles.appIcon}
      style={{ width: props.size, height: props.size }}
    />
  )
}

/**
 * The lockup: the tile and the name, in the version of the colour scheme.
 * It is the name of the product for assistive technology. `height` sets a
 * height in px other than the lockup token, such as in a top bar.
 */
export function Lockup(props: { height?: number }) {
  return (
    <span
      aria-label={productName}
      className={styles.lockup}
      role="img"
      style={{ height: props.height }}
    />
  )
}

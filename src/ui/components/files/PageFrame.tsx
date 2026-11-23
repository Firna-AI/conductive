import type { CSSProperties, ReactNode } from 'react'
import styles from './PageFrame.module.css'

/** The style that makes a screen inside fill the frame, not the window. */
const frameStyle = { '--ui-screen-height': '100%' } as CSSProperties

/**
 * The frame of the page of an HTML file in its tab, from edge to edge under
 * the header of the file, as a Preview tab shows the page of a port. The
 * app loads the page from the preview domain, so its scripts run there,
 * never on the site of the app. A screen drawn inside, such as the page
 * while a preview opens, fills the frame, because `--ui-screen-height`
 * follows the frame. The frame sets it inline: Mokly cannot tell where a
 * custom property of a stylesheet reaches, so it would list every screen
 * that loads the stylesheet as changed.
 */
export function PageFrame(props: { children: ReactNode }) {
  return (
    <div className={styles.frame} style={frameStyle}>
      {props.children}
    </div>
  )
}

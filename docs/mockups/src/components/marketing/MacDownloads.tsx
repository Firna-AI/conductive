import type { Viewport } from '@mokly/mokly'
import { Download } from 'lucide-react'
import type { MacAppSection } from '../../../../../src/marketing/features'
import { macDownloadHref } from '../../../../../src/marketing/links'
import { useOutsideHref } from '../common/ScreenLink'
import { classes } from '../common/classes'
import styles from './MacDownloads.module.css'

type MacDownload = MacAppSection['downloads'][number]

/**
 * One download of the Mac app: a link with the look of the large Firna
 * button, because the file is outside the site. Firna's button has no link
 * role, and a link to a file is an anchor.
 */
function DownloadLink(props: { download: MacDownload; main: boolean }) {
  const href = useOutsideHref(macDownloadHref(props.download.chip))
  return (
    <a
      className={classes(styles.button, props.main && styles.primary)}
      href={href}
    >
      <Download aria-hidden className={styles.icon} size={16} />
      {props.download.label}
    </a>
  )
}

/**
 * The downloads of the Mac app, the main one first, and the oldest macOS
 * version under them. A phone puts the downloads under each other at full
 * width.
 */
export function MacDownloads(props: {
  downloads: MacAppSection['downloads']
  requirement: string
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <div className={classes(styles.downloads, mobile && styles.mobile)}>
      <div className={styles.buttons}>
        {props.downloads.map((download, index) => (
          <DownloadLink
            download={download}
            key={download.chip}
            main={index === 0}
          />
        ))}
      </div>
      <p className={styles.requirement}>{props.requirement}</p>
    </div>
  )
}

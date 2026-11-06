import { ExternalLink } from 'lucide-react'
import type { Preview } from '../shared/previews'
import styles from './PreviewFrame.module.css'

/**
 * What the previewed app may do in its frame. It keeps its own origin, so its
 * cookies and storage work, but it can't navigate the app's page. No
 * `allow-top-navigation` flag may join the list.
 */
const previewSandbox = [
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
  'allow-storage-access-by-user-activation',
].join(' ')

/**
 * A preview in a frame. Its address is the credential, so the frame sends no
 * referrer and the browser sends no cookie of the app.
 */
export function PreviewFrame(props: { preview: Preview }) {
  return (
    <iframe
      className={styles.frame}
      referrerPolicy="no-referrer"
      sandbox={previewSandbox}
      src={props.preview.url}
      title={`Preview of port ${props.preview.port}`}
    />
  )
}

/** Opens the same preview in a new tab, where the app keeps its cookies. */
export function OpenInNewTab(props: { preview: Preview }) {
  return (
    <a
      className={styles.link}
      href={props.preview.url}
      referrerPolicy="no-referrer"
      rel="noopener noreferrer"
      target="_blank"
    >
      Open in new tab
      <ExternalLink aria-hidden size={12} />
    </a>
  )
}

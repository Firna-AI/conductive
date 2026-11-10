import { ArrowDownToLine, X } from 'lucide-react'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton, IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ImportOffer.module.css'

/**
 * The one-time offer of the Mac app when it finds the data of Conductor on
 * the Mac, as a bar at the top of the main area. It reads no data of
 * Conductor yet. Import asks first, and the close button dismisses the
 * offer for good.
 */
export function ImportOffer() {
  return (
    <div
      aria-label="Import from Conductor"
      className={styles.bar}
      role="region"
    >
      <ArrowDownToLine aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        Import your Conductor workspaces, with their chats, into{' '}
        {orgs.acme.name}.
      </span>
      <ScreenLink asChild to={paths.macImportConsent}>
        <ActionButton tone="primary">Import</ActionButton>
      </ScreenLink>
      <ScreenLink asChild to={paths.macWindow}>
        <IconButton icon={X} label="Dismiss the offer" />
      </ScreenLink>
    </div>
  )
}

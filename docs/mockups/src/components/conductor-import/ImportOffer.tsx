import { ArrowDownToLine, X } from 'lucide-react'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton, IconButton } from '../common/actions'
import { LinkedControl } from '../common/LinkedControl'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ImportOffer.module.css'

/**
 * The one-time offer of the Mac app when it finds the data of Conductor on
 * the Mac, as a bar at the top of the main area. It reads no data of
 * Conductor yet. Import asks first, at `importTo`, and null keeps it
 * static. Import is the neutral button of a bar, as Stop is in the bar of
 * the 15 minutes. The close button dismisses the offer for good.
 */
export function ImportOffer(props: { importTo: string | null }) {
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
      <LinkedControl to={props.importTo}>
        <ActionButton>Import</ActionButton>
      </LinkedControl>
      <ScreenLink asChild to={paths.macWindow}>
        <IconButton icon={X} label="Dismiss the offer" />
      </ScreenLink>
    </div>
  )
}

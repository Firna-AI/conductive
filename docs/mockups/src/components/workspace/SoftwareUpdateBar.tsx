import { TriangleAlert, X } from 'lucide-react'
import styles from '../chat/LostUpdate.module.css'
import { IconButton } from '../common/actions'
import { softwareNotUpdated } from './updateCopy'

/**
 * The warning bar under the workspace header after the update of the agent
 * and terminal software failed at a start (decision 8 B of the clean image
 * jobs plan). The start went on with the earlier version, so the workspace
 * works, and its next start tries the update again. The bar looks like the
 * other warning bars under the header, and Dismiss hides it in this view.
 */
export function SoftwareUpdateBar() {
  return (
    <div className={styles.bar} role="status">
      <TriangleAlert aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>{softwareNotUpdated}</span>
      <IconButton icon={X} label="Dismiss" quiet />
    </div>
  )
}

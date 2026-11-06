import { alwaysAllowed, thisMac } from '../../fixtures/mac'
import { ActionButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { DetailList } from './DetailList'
import { Section } from './Section'
import styles from './ThisMacSection.module.css'

/**
 * The Mac that the Mac app registers as a device (decision 62): its name,
 * its state, and the commands that always run on it, each with Remove.
 * Only the Mac app shows it.
 */
export function ThisMacSection() {
  return (
    <Section
      description="Agents can ask to run commands on this Mac while it is awake and the app is open. Each command asks you first."
      status={<StatusText label="Available" tone="success" />}
      title="This Mac"
    >
      <DetailList rows={[{ term: 'Name', value: thisMac.name }]} />
      <span className={styles.label}>Always allowed</span>
      <ul aria-label="Always allowed commands" className={styles.list}>
        {alwaysAllowed.map((command) => (
          <li className={styles.row} key={command}>
            <code className={styles.command}>{command}</code>
            <ActionButton accessibilityLabel={`Remove ${command}`} tone="plain">
              Remove
            </ActionButton>
          </li>
        ))}
      </ul>
    </Section>
  )
}

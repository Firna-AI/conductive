import {
  alwaysAllowed,
  failedMessage,
  notSavedMessage,
  removedCommand,
  thisMac,
} from '../../fixtures/mac'
import { ActionButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { ChangeOutcome, type ChangeStatus } from '../mac/ChangeOutcome'
import { useMacApp, type MacChange } from '../mac/MacApp'
import { DetailList } from './DetailList'
import { Section } from './Section'
import styles from './ThisMacSection.module.css'

/** The result of Remove of `npm run lint`, in each state that shows one. */
const removals: Partial<
  Record<
    MacChange,
    { status: ChangeStatus; title: string; message: string | null }
  >
> = {
  removed: { status: 'done', title: 'Removed', message: null },
  'remove-not-saved': {
    status: 'done-not-saved',
    title: 'Removed, not saved',
    message: notSavedMessage,
  },
  'remove-failed': {
    status: 'failed',
    title: 'Not removed',
    message: failedMessage,
  },
}

/**
 * The Mac that the Mac app registers as a device (decision 62): its name,
 * its state, and the commands that always run on it, each with Remove.
 * After a Remove, the result of the change shows under the list until the
 * next Remove of the same command. A command that the Mac removed, also
 * without saving, leaves the list, so a removal that the Mac did not save
 * offers Try again in its result. Only the Mac app shows the section.
 */
export function ThisMacSection() {
  const change = useMacApp()?.change
  const removal = change ? removals[change] : undefined
  const gone = removal !== undefined && removal.status !== 'failed'
  const commands = alwaysAllowed.filter(
    (command) => !gone || command !== removedCommand,
  )
  return (
    <Section
      description="Agents can ask to run commands on this Mac while it is awake and the app is open. Each command asks you first."
      status={<StatusText label="Available" tone="success" />}
      title="This Mac"
    >
      <DetailList rows={[{ term: 'Name', value: thisMac.name }]} />
      <span className={styles.label}>Always allowed</span>
      <ul aria-label="Always allowed commands" className={styles.list}>
        {commands.map((command) => (
          <li className={styles.row} key={command}>
            <code className={styles.command}>{command}</code>
            <ActionButton accessibilityLabel={`Remove ${command}`} tone="plain">
              Remove
            </ActionButton>
          </li>
        ))}
      </ul>
      {removal ? (
        <ChangeOutcome
          action={
            gone && removal.status !== 'done' ? (
              <ActionButton
                accessibilityLabel={`Try again to remove ${removedCommand}`}
              >
                Try again
              </ActionButton>
            ) : null
          }
          code
          message={removal.message}
          status={removal.status}
          subject={removedCommand}
          title={removal.title}
        />
      ) : null}
    </Section>
  )
}

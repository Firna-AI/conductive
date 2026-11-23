import {
  allowedWorkspaces,
  alwaysAllowed,
  failedMessage,
  longAllowed,
  notSavedMessage,
  removedCommand,
  thisMac,
  untilStop,
} from '../../fixtures/mac'
import { classes } from '../../../../../src/ui/components/common/classes'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import {
  ChangeOutcome,
  type ChangeStatus,
} from '../../../../../src/ui/components/mac/ChangeOutcome'
import {
  useMacApp,
  type MacChange,
} from '../../../../../src/ui/components/mac/MacApp'
import { detailList } from '../../entries/components/settings/DetailList.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { instanceKey } from '../../instanceKey'
import { thisMacDescription } from '../../../../../src/ui/components/settings/thisMacCopy'
import styles from '../../../../../src/ui/components/settings/ThisMacSection.module.css'

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
 * its state, the commands that always run on it, each with Remove, and the
 * workspaces whose commands all run without asking, each with the time
 * left or Until you stop, and Stop (Mac until-stop decision 0).
 * A long command shows three lines with a fade and Show all.
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
    <section.Component
      description={thisMacDescription}
      moklyInstance="this-mac"
      status={
        <statusText.Component
          label="Available"
          moklyInstance="mac-available"
          tone="success"
        />
      }
      title="This Mac"
    >
      <detailList.Component
        moklyInstance="mac-details"
        rows={[{ term: 'Name', value: thisMac.name }]}
      />
      <span className={styles.label}>Always allowed</span>
      <ul aria-label="Always allowed commands" className={styles.list}>
        {commands.map((command) => (
          <li className={styles.row} key={command}>
            {command === longAllowed ? (
              <div className={styles.allowed}>
                <code className={`${styles.command} ${styles.cut}`}>
                  {command}
                </code>
                <span className={styles.more}>
                  <actionButton.Component
                    moklyInstance={`show-all-${instanceKey(command)}`}
                    tone="plain"
                  >
                    Show all
                  </actionButton.Component>
                </span>
              </div>
            ) : (
              <code className={styles.command}>{command}</code>
            )}
            <actionButton.Component
              accessibilityLabel={`Remove ${command}`}
              moklyInstance={`remove-${instanceKey(command)}`}
              tone="plain"
            >
              Remove
            </actionButton.Component>
          </li>
        ))}
      </ul>
      <span className={styles.label}>All commands allowed</span>
      <ul
        aria-label="Workspaces with all commands allowed"
        className={styles.list}
      >
        {allowedWorkspaces.map((grant) => (
          <li className={styles.row} key={grant.name}>
            <span className={styles.workspace}>{grant.name}</span>
            <span
              className={classes(
                styles.left,
                grant.left === null && styles.open,
              )}
            >
              {grant.left === null ? untilStop : `${grant.left} left`}
            </span>
            <actionButton.Component
              accessibilityLabel={`Stop ${grant.name}`}
              icon="square"
              moklyInstance={`stop-${instanceKey(grant.name)}`}
            >
              Stop
            </actionButton.Component>
          </li>
        ))}
      </ul>
      {removal ? (
        <ChangeOutcome
          action={
            gone && removal.status !== 'done' ? (
              <actionButton.Component
                accessibilityLabel={`Try again to remove ${removedCommand}`}
                moklyInstance="retry-remove"
              >
                Try again
              </actionButton.Component>
            ) : null
          }
          code
          message={removal.message}
          status={removal.status}
          subject={removedCommand}
          title={removal.title}
        />
      ) : null}
    </section.Component>
  )
}

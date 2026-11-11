import type { LucideIcon } from 'lucide-react'
import {
  CircleAlert,
  CircleCheck,
  Hammer,
  Play,
  RotateCw,
  X,
} from 'lucide-react'
import type { TerminalLine } from '../../fixtures/terminal'
import { ActionButton, IconButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { TerminalView } from '../tools/TerminalView'
import { runScriptLabel, setupText, type SetupRun } from './updateCopy'
import styles from './InstallScriptNotice.module.css'

/** The icon of each state. A run that goes on shows a spinner instead. */
const icons: Readonly<Record<SetupRun, LucideIcon>> = {
  changed: Hammer,
  running: Hammer,
  finished: CircleCheck,
  failed: CircleAlert,
}

/** The one action of each state: run, nothing while it runs, close, or retry. */
function action(run: SetupRun) {
  switch (run) {
    case 'changed':
      return (
        <ActionButton icon={Play} tone="primary">
          {runScriptLabel}
        </ActionButton>
      )
    case 'running':
      return undefined
    case 'finished':
      return <IconButton icon={X} label="Dismiss" quiet />
    case 'failed':
      return (
        <ActionButton icon={RotateCw} tone="primary">
          Try again
        </ActionButton>
      )
  }
}

/**
 * The notice over the composer of a workspace that started from an org
 * image with an earlier install script (decision 11 C of the clean image
 * jobs plan). Its action runs the install script of the current org image
 * in the workspace, when a member chooses. The notice then shows the output
 * of the script while it runs, and the end of it once the script finished
 * or failed. A finished run closes with Dismiss, and a failed run offers
 * Try again.
 */
export function InstallScriptNotice(props: {
  run: SetupRun
  output: readonly TerminalLine[]
}) {
  const { run } = props
  const text = setupText[run]
  return (
    <Notice
      action={action(run)}
      body={text.body}
      busy={run === 'running'}
      icon={icons[run]}
      title={text.title}
      tone={run === 'failed' ? 'danger' : 'neutral'}
    >
      {run === 'changed' ? null : (
        <div className={styles.output}>
          <TerminalView
            cursor={run === 'running'}
            extraKeys={false}
            lines={props.output}
          />
        </div>
      )}
    </Notice>
  )
}

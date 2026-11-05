import { MockLink } from '@mokly/mokly'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import {
  Check,
  Circle,
  CircleAlert,
  RotateCw,
  SquareTerminal,
} from 'lucide-react'
import {
  baseUpdateSteps,
  failedUpdateOutput,
  type BaseStatus,
  type Repository,
} from '../../fixtures/repositories'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { InlineText } from '../common/InlineText'
import { StatusText } from '../common/StatusText'
import { MonoBlock, Section, SectionText } from './Section'
import styles from './BaseSection.module.css'

const statusLabels = {
  ready: <StatusText label="Ready" tone="success" />,
  updating: <StatusText busy label="Updating" tone="warning" />,
  failed: <StatusText icon={CircleAlert} label="Update failed" tone="danger" />,
} as const

function InstallSoftware(props: { disabled?: boolean }) {
  const button = (
    <ActionButton disabled={props.disabled} icon={SquareTerminal}>
      Install software
    </ActionButton>
  )
  if (props.disabled) return button
  return (
    <MockLink asChild to={paths.installSoftware}>
      {button}
    </MockLink>
  )
}

function UpdateSteps() {
  const theme = useSharedUiTheme()
  return (
    <ol className={styles.steps}>
      {baseUpdateSteps.map((step) => (
        <li className={styles.step} key={step.label}>
          <span className={styles.mark}>
            {step.state === 'done' ? (
              <Check className={styles.done} size={16} />
            ) : step.state === 'running' ? (
              <Spinner
                accessibilityLabel="In progress"
                color={theme.colors.muted}
                size={12}
              />
            ) : (
              <Circle className={styles.waiting} size={14} />
            )}
          </span>
          <span
            className={
              step.state === 'waiting' ? styles.waitingText : undefined
            }
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** The base of a repository: its state, and the actions on it. */
export function BaseSection(props: {
  base: BaseStatus
  repository: Repository
}) {
  const { repository } = props
  const updated = `Updated ${repository.baseUpdated} from ${repository.defaultBranch} at \`${repository.baseCommit}\`.`
  switch (props.base) {
    case 'ready':
      return (
        <Section
          actions={
            <>
              <ActionButton icon={RotateCw}>Update now</ActionButton>
              <InstallSoftware />
            </>
          }
          description="New workspaces start from the base. It updates after pushes to main, at most every 30 minutes, and once a day."
          status={statusLabels.ready}
          title="Base"
        >
          <SectionText>
            <InlineText text={updated} />
          </SectionText>
        </Section>
      )
    case 'updating':
      return (
        <Section
          actions={<InstallSoftware disabled />}
          description="New workspaces start from the previous base until the update finishes."
          status={statusLabels.updating}
          title="Base"
        >
          <UpdateSteps />
        </Section>
      )
    case 'failed':
      return (
        <Section
          actions={
            <>
              <ActionButton icon={RotateCw} tone="primary">
                Try again
              </ActionButton>
              <InstallSoftware />
            </>
          }
          status={statusLabels.failed}
          title="Base"
        >
          <SectionText>The startup script failed.</SectionText>
          <MonoBlock text={failedUpdateOutput} />
          <SectionText muted>
            New workspaces still start from the base saved{' '}
            {repository.baseUpdated}.
          </SectionText>
        </Section>
      )
  }
}

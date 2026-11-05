import { MockLink } from '@mokly/mokly'
import { Badge } from '@firna/ui/badge'
import { Button } from '@firna/ui/button'
import { Spinner } from '@firna/ui/spinner'
import { Body, Caption } from '@firna/ui/typography'
import { Check, Circle, RotateCw, SquareTerminal } from 'lucide-react'
import {
  baseUpdateSteps,
  failedUpdateOutput,
  type BaseStatus,
  type Repository,
} from '../../fixtures/repositories'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { centredBadge } from '../common/badgeStyle'
import { InlineText } from '../common/InlineText'
import { MonoBlock, Section } from './Section'
import styles from './BaseSection.module.css'

const statusBadges = {
  ready: (
    <Badge size="sm" style={centredBadge} tone="primary">
      Ready
    </Badge>
  ),
  updating: (
    <Badge dot pulse size="sm" style={centredBadge} tone="warning">
      Updating
    </Badge>
  ),
  failed: (
    <Badge size="sm" style={centredBadge} tone="danger">
      Update failed
    </Badge>
  ),
} as const

function InstallSoftware(props: { disabled?: boolean }) {
  const button = (
    <Button
      disabled={props.disabled}
      icon={SquareTerminal}
      onPress={noop}
      size="sm"
      tone="secondary"
    >
      Install software
    </Button>
  )
  if (props.disabled) return button
  return (
    <MockLink asChild to={paths.installSoftware}>
      {button}
    </MockLink>
  )
}

function UpdateSteps() {
  return (
    <ol className={styles.steps}>
      {baseUpdateSteps.map((step) => (
        <li className={styles.step} key={step.label}>
          <span className={styles.mark}>
            {step.state === 'done' ? (
              <Check className={styles.done} size={16} />
            ) : step.state === 'running' ? (
              <Spinner accessibilityLabel="In progress" size={14} />
            ) : (
              <Circle className={styles.waiting} size={14} />
            )}
          </span>
          <Body color={step.state === 'waiting' ? 'muted' : 'default'}>
            {step.label}
          </Body>
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
              <Button icon={RotateCw} onPress={noop} size="sm" tone="secondary">
                Update now
              </Button>
              <InstallSoftware />
            </>
          }
          description="New workspaces start from the base. It updates after pushes to main, at most every 30 minutes, and once a day."
          status={statusBadges.ready}
          title="Base"
        >
          <Body>
            <InlineText text={updated} />
          </Body>
        </Section>
      )
    case 'updating':
      return (
        <Section
          actions={<InstallSoftware disabled />}
          description="New workspaces start from the previous base until the update finishes."
          status={statusBadges.updating}
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
              <Button icon={RotateCw} onPress={noop} size="sm" tone="primary">
                Try again
              </Button>
              <InstallSoftware />
            </>
          }
          status={statusBadges.failed}
          title="Base"
        >
          <Body>The startup script failed.</Body>
          <MonoBlock text={failedUpdateOutput} />
          <Caption>
            New workspaces still start from the base saved{' '}
            {repository.baseUpdated}.
          </Caption>
        </Section>
      )
  }
}

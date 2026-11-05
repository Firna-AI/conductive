import { Button } from '@firna/ui/button'
import { Loader } from '@firna/ui/loader'
import { H5 } from '@firna/ui/typography'
import { CircleAlert, CirclePause } from 'lucide-react'
import { noop } from '../../noop'
import { EmptyState } from '../common/EmptyState'
import { Notice } from '../common/Notice'
import styles from './SandboxNotice.module.css'

export type SandboxProblem = 'stopped' | 'error'

const saved = 'Your files and chat are saved.'

function RecoveryButton(props: { problem: SandboxProblem }) {
  return (
    <Button onPress={noop} size="sm" tone="primary">
      {props.problem === 'stopped' ? 'Resume' : 'Try again'}
    </Button>
  )
}

/** The bar that replaces the composer while the sandbox is not running. */
export function SandboxBar(props: { problem: SandboxProblem }) {
  const stopped = props.problem === 'stopped'
  return (
    <Notice
      action={<RecoveryButton problem={props.problem} />}
      body={saved}
      icon={stopped ? CirclePause : CircleAlert}
      title={stopped ? 'Sandbox stopped' : "The sandbox couldn't start"}
      tone={stopped ? 'neutral' : 'danger'}
    />
  )
}

/**
 * What a tool shows while the sandbox is not running. The desktop layout
 * leaves the action to the chat bar beside it.
 */
export function SandboxPanel(props: {
  state: 'starting' | SandboxProblem
  action: boolean
}) {
  if (props.state === 'starting') {
    return (
      <div className={styles.starting}>
        <Loader accessibilityLabel="Starting the sandbox" />
        <H5>Starting the sandbox</H5>
      </div>
    )
  }
  const stopped = props.state === 'stopped'
  return (
    <EmptyState
      action={
        props.action ? <RecoveryButton problem={props.state} /> : undefined
      }
      body={saved}
      icon={stopped ? CirclePause : CircleAlert}
      title={stopped ? 'Sandbox stopped' : "The sandbox couldn't start"}
    />
  )
}

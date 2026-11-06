import { Input } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { productName } from '../../brand'
import type { AgentKey } from '../../fixtures/agents'
import {
  claudeTokenCommand,
  loginLabels,
  openAiKeyPage,
  type LoginKind,
} from '../../fixtures/logins'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { ExternalLink } from '../common/ExternalLink'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import styles from './AgentConnectForm.module.css'

const testHint = `${productName} tests it once, and never shows it again.`

/** Claude connects with a subscription token, or with an API key. */
const claudeKinds: readonly LoginKind[] = ['token', 'api-key']

function ClaudeFields() {
  const { field } = useControlSizes()
  return (
    <>
      <SegmentedControl
        accessibilityLabel="Connect with"
        onChange={noop}
        options={claudeKinds.map((kind) => ({
          label: loginLabels[kind],
          value: kind,
        }))}
        size={field}
        value="token"
      />
      <p className={styles.text}>
        Run <code className={styles.code}>{claudeTokenCommand}</code> on your
        computer, then paste the token that it prints.
      </p>
      <Input
        autoComplete="off"
        hint={testHint}
        label="Subscription token"
        onChangeText={noop}
        placeholder="Paste the token"
        secureTextEntry
        size={field}
        value=""
      />
    </>
  )
}

function CodexFields() {
  const { field } = useControlSizes()
  return (
    <>
      <p className={styles.text}>
        Paste an API key of your OpenAI account.{' '}
        <ExternalLink href={openAiKeyPage}>Make one on OpenAI</ExternalLink>
      </p>
      <Input
        autoComplete="off"
        hint={testHint}
        label="OpenAI API key"
        onChangeText={noop}
        placeholder="Paste the key"
        secureTextEntry
        size={field}
        value=""
      />
    </>
  )
}

/**
 * The form that connects an agent, open under its row: Claude with a
 * subscription token or an API key, and Codex with an OpenAI API key.
 * Connect leads to `connectTo`. Cancel shows when the form can close.
 */
export function AgentConnectForm(props: {
  agent: AgentKey
  connectTo: string
  cancel: boolean
}) {
  return (
    <div className={styles.form}>
      {props.agent === 'claude' ? <ClaudeFields /> : <CodexFields />}
      <div className={styles.actions}>
        {props.cancel ? <ActionButton>Cancel</ActionButton> : null}
        <ScreenLink asChild to={props.connectTo}>
          <ActionButton tone="primary">Connect</ActionButton>
        </ScreenLink>
      </div>
    </div>
  )
}

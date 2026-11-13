import { Switch } from '@firna/ui/switch'
import { Bot, Copy, EyeOff } from 'lucide-react'
import { noop } from '../../noop'
import { IconButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { useControlSizes } from '../common/touch'
import { secretsWords } from './secretsCopy'
import env from '../settings/EnvironmentSections.module.css'
import styles from './SecretsTab.module.css'

/**
 * The switch of the mark for all agents, with its visible label, which an
 * admin changes and which saves at once. `label` names the switch for
 * assistive technology, such as "PROD_DATABASE_URL for all agents".
 */
export function AllAgentsSwitch(props: { label: string; value: boolean }) {
  const { field } = useControlSizes()
  return (
    <span className={env.secret}>
      <Switch
        accessibilityLabel={props.label}
        onValueChange={noop}
        size={field === 'lg' ? 'md' : 'sm'}
        value={props.value}
      />
      <span aria-hidden>{secretsWords.allAgents}</span>
    </span>
  )
}

/**
 * The mark for all agents without a control, for a person who may not
 * change it. A secret without the mark leaves the place empty, so the
 * values of the rows stay in line.
 */
export function AllAgentsMark(props: { on: boolean }) {
  return (
    <span className={styles.mark}>
      {props.on ? (
        <StatusText icon={Bot} label={secretsWords.allAgents} tone="neutral" />
      ) : null}
    </span>
  )
}

/**
 * A value that an admin revealed, on a line of its own under its secret,
 * with Copy and Hide. Only one value shows at a time (secrets decision 2).
 */
export function RevealedValue(props: { name: string; value: string }) {
  return (
    <span className={styles.revealed}>
      <code className={styles.revealedValue}>{props.value}</code>
      <span className={styles.actions}>
        <IconButton icon={Copy} label={`${secretsWords.copy} ${props.name}`} />
        <IconButton
          icon={EyeOff}
          label={`${secretsWords.hide} the value of ${props.name}`}
        />
      </span>
    </span>
  )
}

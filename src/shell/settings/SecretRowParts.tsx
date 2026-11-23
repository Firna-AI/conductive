import { Switch } from '@firna/ui/switch'
import { useToast } from '@firna/ui/toast'
import { Copy, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { useControlSizes } from '../../ui/components/common/touch'
import { secretsWords } from '../../ui/components/secrets/secretsCopy'
import styles from '../../ui/components/secrets/SecretsTab.module.css'
import env from '../../ui/components/settings/EnvironmentSections.module.css'
import type { SecretRights } from '../../app/permissions'
import type { SecretsModel } from '../../app/secrets-model'
import { useServices } from '../../app/services'
import type { OrgSecret } from '../../shared/secrets'
import { IconButton } from '../ui/actions'
import { useAction, type Action } from '../ui/useAction'

/**
 * The switch of the mark for all agents, with its visible label, which an
 * admin changes. A change saves at once. While it saves, the switch shows
 * the new mark and takes no other change. After a failure it shows the
 * saved mark again, and a toast names the secret.
 */
export function AllAgentsSwitch(props: {
  secret: OrgSecret
  model: SecretsModel
}) {
  const { secret, model } = props
  const { field } = useControlSizes()
  const mark = useAction(
    (on: boolean) => model.setAllAgents(secret.id, on),
    `The All agents mark of ${secret.name} was not saved`,
  )
  return (
    <span className={env.secret}>
      <Switch
        accessibilityLabel={`${secret.name} for all agents`}
        disabled={mark.pending}
        onValueChange={(on) => mark.run(on)}
        size={field === 'lg' ? 'md' : 'sm'}
        value={secret.allAgents}
      />
      <span aria-hidden>{secretsWords.allAgents}</span>
    </span>
  )
}

/**
 * A value that an admin revealed, on a line of its own under its secret,
 * with Copy and Hide. Only one value shows at a time (secrets decision 2 A).
 */
export function RevealedValue(props: {
  name: string
  value: string
  hide: () => void
}) {
  const { name, value } = props
  const services = useServices()
  const { toast } = useToast()
  const copy = useAction(async () => {
    await services.copy(value)
    toast({ title: `The value of ${name} is copied.`, tone: 'success' })
  }, `The value of ${name} didn't copy.`)
  return (
    <span className={styles.revealed}>
      <code className={styles.revealedValue}>{value}</code>
      <span className={styles.actions}>
        <IconButton
          busy={copy.pending}
          icon={Copy}
          label={`${secretsWords.copy} ${name}`}
          onPress={() => copy.run()}
        />
        <IconButton
          icon={EyeOff}
          label={`${secretsWords.hide} the value of ${name}`}
          onPress={props.hide}
        />
      </span>
    </span>
  )
}

/**
 * Reveal, Replace, and Delete, as the rights of the viewer allow. A value
 * that shows needs no Reveal.
 */
export function RowActions(props: {
  secret: OrgSecret
  rights: SecretRights
  revealed: boolean
  reveal: Action<[]>
  replace: () => void
  remove: () => void
}) {
  const { secret, rights } = props
  return (
    <span className={styles.actions}>
      {rights.reveal && !props.revealed ? (
        <IconButton
          busy={props.reveal.pending}
          icon={Eye}
          label={`Reveal the value of ${secret.name}`}
          onPress={() => props.reveal.run()}
        />
      ) : null}
      {rights.change ? (
        <>
          <IconButton
            icon={Pencil}
            label={`Replace the description or the value of ${secret.name}`}
            onPress={props.replace}
          />
          <IconButton
            icon={Trash2}
            label={`Delete ${secret.name}`}
            onPress={props.remove}
          />
        </>
      ) : null}
    </span>
  )
}

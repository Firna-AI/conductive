import { AllAgentsMark } from '../../ui/components/secrets/SecretParts'
import { addedBy, revealedBy } from '../../ui/components/secrets/secretsCopy'
import styles from '../../ui/components/secrets/SecretsTab.module.css'
import { ValueDots } from '../../ui/components/settings/EnvVarParts'
import { nameInSentence } from '../../app/people'
import type { SecretRights } from '../../app/permissions'
import type { SecretsModel } from '../../app/secrets-model'
import type { User } from '../../shared/api'
import type { OrgSecret } from '../../shared/secrets'
import { useAction } from '../ui/useAction'
import { ReplaceSecretForm } from './SecretForms'
import { AllAgentsSwitch, RevealedValue, RowActions } from './SecretRowParts'
import { inSentence, useWhen } from './when'

/** Who added the secret, and the record of the last reveal of its value. */
function rowMeta(
  secret: OrgSecret,
  viewer: User,
  when: (time: number) => string,
): string {
  const added = addedBy(
    nameInSentence(secret.createdBy, secret.createdByUserId, viewer.id),
  )
  const reveal = secret.lastReveal
  if (reveal === null) return added
  const who = nameInSentence(
    reveal.revealedBy,
    reveal.revealedByUserId,
    viewer.id,
  )
  return `${added} · ${revealedBy(who, inSentence(when(reveal.revealedAt)))}`
}

/** What a row does for its secret, as the tab holds it. */
export interface RowControls {
  /** The value that the viewer revealed, which shows on its own line. */
  value: string | null
  /** The Replace form shows in the place of the value and the actions. */
  replacing: boolean
  /** Shows a revealed value, or hides it with null. */
  show: (value: string | null) => void
  /** Opens or closes the Replace form. */
  replace: (open: boolean) => void
  /** Asks before Delete. */
  remove: () => void
}

/**
 * One secret of the org: its name, its description, who added it, and the
 * record of the last reveal, which every member sees. Then the mark for all
 * agents, a switch for an admin, the value as dots, and the actions that the
 * viewer may take. A revealed value shows on a line of its own. The Replace
 * form shows on a line of its own too, in the place of the value and the
 * actions. No row holds a value until an admin reveals one.
 */
export function SecretRow(props: {
  secret: OrgSecret
  rights: SecretRights
  viewer: User
  model: SecretsModel
  controls: RowControls
}) {
  const { secret, rights, model, controls } = props
  const { when } = useWhen(60_000)
  const reveal = useAction(
    async () => controls.show(await model.reveal(secret.id, props.viewer)),
    `The value of ${secret.name} was not revealed`,
  )
  const revealed = controls.value !== null && rights.reveal
  const replacing = controls.replacing && rights.change
  return (
    <li className={styles.row}>
      <span className={styles.text}>
        <span className={styles.name}>{secret.name}</span>
        <span className={styles.description}>{secret.description}</span>
        <span className={styles.meta}>
          {rowMeta(secret, props.viewer, when)}
        </span>
      </span>
      <span className={styles.markCell}>
        {rights.mark ? (
          <AllAgentsSwitch model={model} secret={secret} />
        ) : (
          <AllAgentsMark on={secret.allAgents} />
        )}
      </span>
      {replacing ? (
        <ReplaceSecretForm
          close={() => controls.replace(false)}
          model={model}
          secret={secret}
          valueChanged={() => controls.show(null)}
        />
      ) : (
        <>
          <span className={styles.valueCell}>
            {revealed ? null : <ValueDots />}
          </span>
          <RowActions
            remove={controls.remove}
            replace={() => controls.replace(true)}
            reveal={reveal}
            revealed={revealed}
            rights={rights}
            secret={secret}
          />
        </>
      )}
      {revealed && controls.value !== null ? (
        <RevealedValue
          hide={() => controls.show(null)}
          name={secret.name}
          value={controls.value}
        />
      ) : null}
    </li>
  )
}

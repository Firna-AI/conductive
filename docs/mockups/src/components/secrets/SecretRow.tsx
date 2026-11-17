import { Eye, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import { people, type PersonKey } from '../../fixtures/members'
import { revealedValue, type OrgSecret } from '../../fixtures/secrets'
import { IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { ValueDots } from '../settings/EnvVarParts'
import { ReplaceForm } from './SecretForms'
import { AllAgentsMark, AllAgentsSwitch, RevealedValue } from './SecretParts'
import type { SecretRights } from './secretRights'
import { addedBy, revealedBy } from './secretsCopy'
import styles from './SecretsTab.module.css'

/**
 * How a row shows its secret: with its value hidden, with the value that
 * an admin just revealed, or with the Replace form of its description and
 * its value.
 */
export type RowMode = 'hidden' | 'revealed' | 'replacing'

/** A member as a row names them: "you" for the person signed in. */
function nameOf(person: PersonKey, viewer: PersonKey): string {
  return person === viewer ? 'you' : people[person].name
}

/**
 * Who added the secret, and the record of the last reveal. A value that
 * the viewer just revealed shows that reveal.
 */
function rowMeta(secret: OrgSecret, mode: RowMode, viewer: PersonKey): string {
  const added = addedBy(nameOf(secret.creator, viewer))
  const reveal =
    mode === 'revealed' ? { by: viewer, when: 'just now' } : secret.revealed
  if (reveal === undefined) return added
  return `${added} · ${revealedBy(nameOf(reveal.by, viewer), reveal.when)}`
}

/** The screens that the actions of a row lead to, where the mockups draw them. */
export type RowLinks = { reveal?: string; replace?: string; delete?: string }

/** An icon button, as a link to its screen when the mockups draw one. */
function RowAction(props: { icon: LucideIcon; label: string; to?: string }) {
  const button = <IconButton icon={props.icon} label={props.label} />
  if (props.to === undefined) return button
  return (
    <ScreenLink asChild to={props.to}>
      {button}
    </ScreenLink>
  )
}

/** Reveal, Replace, and Delete, as the rights of the viewer allow. */
function RowActions(props: {
  name: string
  rights: SecretRights
  revealed: boolean
  links: RowLinks
}) {
  const { name, rights, links } = props
  return (
    <span className={styles.actions}>
      {rights.reveal && !props.revealed ? (
        <RowAction
          icon={Eye}
          label={`Reveal the value of ${name}`}
          to={links.reveal}
        />
      ) : null}
      {rights.change ? (
        <>
          <RowAction
            icon={Pencil}
            label={`Replace the description or the value of ${name}`}
            to={links.replace}
          />
          <RowAction icon={Trash2} label={`Delete ${name}`} to={links.delete} />
        </>
      ) : null}
    </span>
  )
}

/**
 * One secret of the org: its name, its description, who added it, and the
 * record of the last reveal. Then the mark for all agents, a switch for an
 * admin, the hidden value, and the actions that the viewer may take. A
 * revealed value shows on a line of its own. The Replace form shows on a
 * line of its own too, in the place of the value and the actions.
 */
export function SecretRow(props: {
  secret: OrgSecret
  rights: SecretRights
  mode: RowMode
  viewer: PersonKey
  links: RowLinks
}) {
  const { secret, rights, mode } = props
  return (
    <li className={styles.row}>
      <span className={styles.text}>
        <span className={styles.name}>{secret.name}</span>
        <span className={styles.description}>{secret.description}</span>
        <span className={styles.meta}>
          {rowMeta(secret, mode, props.viewer)}
        </span>
      </span>
      <span className={styles.markCell}>
        {rights.mark ? (
          <AllAgentsSwitch
            label={`${secret.name} for all agents`}
            value={secret.allAgents}
          />
        ) : (
          <AllAgentsMark on={secret.allAgents} />
        )}
      </span>
      {mode === 'replacing' ? (
        <ReplaceForm secret={secret} />
      ) : (
        <>
          <span className={styles.valueCell}>
            {mode === 'revealed' ? null : <ValueDots />}
          </span>
          <RowActions
            links={props.links}
            name={secret.name}
            revealed={mode === 'revealed'}
            rights={rights}
          />
        </>
      )}
      {mode === 'revealed' ? (
        <RevealedValue name={secret.name} value={revealedValue} />
      ) : null}
    </li>
  )
}

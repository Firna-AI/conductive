import type { ReactNode } from 'react'
import { Switch } from '@firna/ui/switch'
import type { PersonKey } from '../../fixtures/members'
import type { WorkspaceGrants } from '../../fixtures/secretRequests'
import type { OrgSecret } from '../../fixtures/secrets'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { SearchField } from '../common/SearchField'
import { useControlSizes } from '../common/touch'
import { whoOf } from '../chat/SecretRun'
import {
  macAccessWords,
  noSecretMatch,
  noSecrets,
  secretsPartWords,
} from './capabilitiesCopy'
import type { CapabilityPart } from './CapabilitiesPanel'
import { GrantList } from './GrantList'
import { matchingSecrets, needsSecretSearch } from './secretSearch'
import check from '../common/CheckOption.module.css'
import styles from './Capabilities.module.css'

/** What the Capabilities control shows for one workspace or one draft. */
export type CapabilitiesView = {
  /** The org, whose secrets the workspace can use. */
  org: string
  secrets: readonly OrgSecret[]
  /** The names of the secrets that the workspace pre-approves. */
  preApproved: readonly string[]
  /**
   * The text in the search field, which shows above more than ten secrets.
   * It narrows the list by name and by description.
   */
  search?: string
  /**
   * The approvals of the sessions and the values for the workspace, which
   * only a workspace that exists has.
   */
  grants?: WorkspaceGrants
  macAccess: boolean
  /** The Secrets tab of the org settings. */
  secretsTo: string
  /** The person signed in, who reads "you" for their own grants. */
  viewer: PersonKey
}

/**
 * What the secrets of the control show: the secrets of the org with the
 * pre-approved ones checked, and the link to the Secrets tab.
 */
type SecretsView = Pick<
  CapabilitiesView,
  'org' | 'secrets' | 'preApproved' | 'search' | 'secretsTo'
>

/**
 * A secret of the org with its checkbox, which pre-approves it for the
 * workspace. A secret for all agents is always available, so its checkbox
 * stays checked and off.
 */
function SecretCheck(props: { secret: OrgSecret; checked: boolean }) {
  const { secret } = props
  return (
    <label className={check.option}>
      <input
        checked={props.checked || secret.allAgents}
        className={check.box}
        disabled={secret.allAgents}
        onChange={noop}
        type="checkbox"
      />
      <span className={check.text}>
        <span className={styles.secretName}>{secret.name}</span>
        <span className={check.hint}>{secret.description}</span>
      </span>
      {secret.allAgents ? (
        <span className={styles.tag}>{secretsPartWords.allAgents}</span>
      ) : null}
    </label>
  )
}

/**
 * The secrets of the org, each with its checkbox. An org without secrets
 * links to its Secrets tab. More than ten secrets get a search field above
 * them, and a search that matches none says so.
 */
function SecretPicker(props: { view: SecretsView }) {
  const { view } = props
  if (view.secrets.length === 0) {
    return (
      <p className={styles.empty}>
        {noSecrets(view.org)}{' '}
        <ScreenLink className={styles.link} to={view.secretsTo}>
          {secretsPartWords.add}
        </ScreenLink>
      </p>
    )
  }
  const search = view.search ?? ''
  const list = (
    <SecretChecks secrets={matchingSecrets(view.secrets, search)} view={view} />
  )
  if (!needsSecretSearch(view.secrets.length)) return list
  return (
    <div className={styles.picker}>
      <SearchField
        label={secretsPartWords.search}
        placeholder={secretsPartWords.search}
        query={search}
      />
      {list}
    </div>
  )
}

/** The listed secrets with their checkboxes, or the line of no match. */
function SecretChecks(props: {
  secrets: readonly OrgSecret[]
  view: SecretsView
}) {
  const { view } = props
  if (props.secrets.length === 0) {
    return <p className={styles.empty}>{noSecretMatch(view.search ?? '')}</p>
  }
  return (
    <div
      aria-label="Pre-approved secrets"
      className={styles.checks}
      role="group"
    >
      {props.secrets.map((secret) => (
        <SecretCheck
          checked={view.preApproved.includes(secret.name)}
          key={secret.name}
          secret={secret}
        />
      ))}
    </div>
  )
}

function SecretsContent(props: { view: CapabilitiesView }) {
  const { view } = props
  return (
    <>
      <SecretPicker view={view} />
      {view.grants ? (
        <GrantList
          grants={view.grants}
          who={(person) => whoOf(person, view.viewer).object}
        />
      ) : null}
    </>
  )
}

/** The switch of Mac access, which saves at once. */
function MacAccessSwitch(props: { on: boolean }) {
  const { field } = useControlSizes()
  return (
    <Switch
      accessibilityLabel={macAccessWords.title}
      onValueChange={noop}
      size={field === 'lg' ? 'md' : 'sm'}
      value={props.on}
    />
  )
}

/**
 * The secrets part, with its hint and its content. Manage secrets opens the
 * Secrets tab, while the org has secrets.
 */
function secretsPart(
  view: SecretsView,
  hint: string,
  content: ReactNode,
): CapabilityPart {
  return {
    key: 'secrets',
    title: secretsPartWords.title,
    hint,
    control:
      view.secrets.length === 0 ? undefined : (
        <ScreenLink className={styles.link} to={view.secretsTo}>
          {secretsPartWords.manage}
        </ScreenLink>
      ),
    content,
  }
}

/**
 * The parts of the Capabilities control, in their order: the secrets that
 * the workspace pre-approves, with its grants, and Mac access.
 */
export function capabilityParts(view: CapabilitiesView): CapabilityPart[] {
  return [
    secretsPart(view, secretsPartWords.hint, <SecretsContent view={view} />),
    {
      key: 'mac-access',
      title: macAccessWords.title,
      hint: macAccessWords.hint,
      control: <MacAccessSwitch on={view.macAccess} />,
    },
  ]
}

/**
 * The parts of the Capabilities control of an automation: only the secrets
 * that each run workspace pre-approves (automation capabilities decision
 * 1 A). Each run workspace keeps Mac access off (decision 2 A), so the
 * control has no Mac access part. An automation has no grants of its own.
 */
export function automationCapabilityParts(view: SecretsView): CapabilityPart[] {
  return [
    secretsPart(
      view,
      secretsPartWords.automationHint,
      <SecretPicker view={view} />,
    ),
  ]
}

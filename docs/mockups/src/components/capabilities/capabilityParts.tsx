import { Switch } from '@firna/ui/switch'
import type { PersonKey } from '../../fixtures/members'
import type { WorkspaceGrants } from '../../fixtures/secretRequests'
import type { OrgSecret } from '../../fixtures/secrets'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { whoOf } from '../chat/SecretRun'
import { macAccessWords, noSecrets, secretsPartWords } from './capabilitiesCopy'
import type { CapabilityPart } from './CapabilitiesPanel'
import { GrantList } from './GrantList'
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
 * The secrets of the org, each with its checkbox, then the grants of the
 * workspace. An org without secrets links to its Secrets tab.
 */
function SecretsContent(props: { view: CapabilitiesView }) {
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
  return (
    <>
      <div
        aria-label="Pre-approved secrets"
        className={styles.checks}
        role="group"
      >
        {view.secrets.map((secret) => (
          <SecretCheck
            checked={view.preApproved.includes(secret.name)}
            key={secret.name}
            secret={secret}
          />
        ))}
      </div>
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
 * The parts of the Capabilities control, in their order: the secrets that
 * the workspace pre-approves, with its grants, and Mac access, which is on
 * by default (secrets decision 9).
 */
export function capabilityParts(view: CapabilitiesView): CapabilityPart[] {
  return [
    {
      key: 'secrets',
      title: secretsPartWords.title,
      hint: secretsPartWords.hint,
      control:
        view.secrets.length === 0 ? undefined : (
          <ScreenLink className={styles.link} to={view.secretsTo}>
            {secretsPartWords.manage}
          </ScreenLink>
        ),
      content: <SecretsContent view={view} />,
    },
    {
      key: 'mac-access',
      title: macAccessWords.title,
      hint: macAccessWords.hint,
      control: <MacAccessSwitch on={view.macAccess} />,
    },
  ]
}

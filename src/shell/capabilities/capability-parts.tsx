import { useId, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { Switch } from '@firna/ui/switch'
import { useSharedUiTheme } from '@firna/ui/theme'
import {
  macAccessWords,
  noSecrets,
  secretsPartWords,
} from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import type { CapabilityPart } from '../../../docs/mockups/src/components/capabilities/CapabilitiesPanel'
import styles from '../../../docs/mockups/src/components/capabilities/Capabilities.module.css'
import check from '../../../docs/mockups/src/components/common/CheckOption.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { routes } from '../../app/router'
import type { Loadable } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import type { OrgSecret } from '../../shared/secrets'
import { AppLink } from '../ui/AppLink'
import { LoadFailure } from '../ui/LoadFailure'

/** What the Capabilities control shows for one workspace or one draft. */
export interface CapabilitiesView {
  /** The org, whose secrets the workspace can use. */
  org: OrgSummary
  /** The secrets of the org, as their read gives them. */
  secrets: Loadable<readonly OrgSecret[]>
  /** Try again of a read that failed. */
  retry: () => Promise<void>
  /** The IDs of the secrets that the workspace pre-approves. */
  preapproved: readonly string[]
  setPreapproved: (secretId: string, on: boolean) => void
  /** Mac access, or null while its read runs, which hides its switch. */
  macAccess: boolean | null
  setMacAccess: (on: boolean) => void
  /** The controls take no change, such as while a create or a change runs. */
  disabled: boolean
  /**
   * The approvals of the sessions, each with Remove, which only a workspace
   * that exists has.
   */
  grants?: ReactNode
}

/**
 * What the secrets part shows: the secrets of the org with the pre-approved
 * ones checked, and the link to the Secrets tab. An automation has only
 * this part.
 */
export type SecretsView = Pick<
  CapabilitiesView,
  'org' | 'secrets' | 'retry' | 'preapproved' | 'setPreapproved' | 'disabled'
>

/**
 * A secret of the org with its checkbox, which pre-approves it for the
 * workspace. A secret for all agents is always available, so its checkbox
 * stays checked and off, with the words "All agents".
 */
function SecretCheck(props: {
  secret: OrgSecret
  checked: boolean
  disabled: boolean
  change: (on: boolean) => void
}) {
  const { secret } = props
  const hint = useId()
  const tag = useId()
  return (
    <label className={check.option}>
      <input
        aria-describedby={secret.allAgents ? `${hint} ${tag}` : hint}
        aria-label={secret.name}
        checked={props.checked || secret.allAgents}
        className={check.box}
        disabled={secret.allAgents || props.disabled}
        onChange={(event) => props.change(event.currentTarget.checked)}
        type="checkbox"
      />
      <span className={check.text}>
        <span className={styles.secretName}>{secret.name}</span>
        <span className={check.hint} id={hint}>
          {secret.description}
        </span>
      </span>
      {secret.allAgents ? (
        <span className={styles.tag} id={tag}>
          {secretsPartWords.allAgents}
        </span>
      ) : null}
    </label>
  )
}

/**
 * The secrets of the org, each with its checkbox. An org without secrets
 * links to its Secrets tab. A quiet spinner shows while the secrets load,
 * and a failed read shows Try again.
 */
function SecretPicker(props: { view: SecretsView }) {
  const { view } = props
  const theme = useSharedUiTheme()
  const { secrets } = view
  if (secrets.state === 'loading') {
    return <Spinner color={theme.colors.muted} size={14} />
  }
  if (secrets.state === 'failed') {
    return (
      <LoadFailure
        error={secrets.error}
        retry={view.retry}
        title="The secrets did not load"
      />
    )
  }
  if (secrets.value.length === 0) {
    return (
      <p className={styles.empty}>
        {noSecrets(view.org.name)}{' '}
        <AppLink
          className={styles.link}
          to={routes.settings(view.org.id, 'secrets')}
        >
          {secretsPartWords.add}
        </AppLink>
      </p>
    )
  }
  return (
    <div
      aria-label="Pre-approved secrets"
      className={styles.checks}
      role="group"
    >
      {secrets.value.map((secret) => (
        <SecretCheck
          change={(on) => view.setPreapproved(secret.id, on)}
          checked={view.preapproved.includes(secret.id)}
          disabled={view.disabled}
          key={secret.id}
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
      {view.grants}
    </>
  )
}

/** The switch of Mac access, which saves at once. */
function MacAccessSwitch(props: {
  on: boolean
  change: (on: boolean) => void
  disabled: boolean
}) {
  const { field } = useControlSizes()
  return (
    <Switch
      accessibilityLabel={macAccessWords.title}
      disabled={props.disabled}
      onValueChange={props.change}
      size={field === 'lg' ? 'md' : 'sm'}
      value={props.on}
    />
  )
}

/**
 * The secrets part, with its hint and its content. Manage secrets opens the
 * Secrets tab of the org settings, while the org has secrets.
 */
function secretsPart(
  view: SecretsView,
  hint: string,
  content: ReactNode,
): CapabilityPart {
  const listed = view.secrets.state === 'ready' && view.secrets.value.length > 0
  return {
    key: 'secrets',
    title: secretsPartWords.title,
    hint,
    control: listed ? (
      <AppLink
        className={styles.link}
        to={routes.settings(view.org.id, 'secrets')}
      >
        {secretsPartWords.manage}
      </AppLink>
    ) : undefined,
    content,
  }
}

/**
 * The parts of the Capabilities control, in their order: the secrets that
 * the workspace pre-approves, with its grants, and Mac access. Later
 * features, such as MCP servers, add their own parts here.
 */
export function capabilityParts(view: CapabilitiesView): CapabilityPart[] {
  return [
    secretsPart(view, secretsPartWords.hint, <SecretsContent view={view} />),
    {
      key: 'mac-access',
      title: macAccessWords.title,
      hint: macAccessWords.hint,
      control:
        view.macAccess === null ? undefined : (
          <MacAccessSwitch
            change={view.setMacAccess}
            disabled={view.disabled}
            on={view.macAccess}
          />
        ),
    },
  ]
}

/**
 * The parts of the Capabilities control of an automation: only the secrets
 * that each run workspace pre-approves (automation capabilities decision
 * 1 A), with their own hint. Each run workspace keeps Mac access off
 * (decision 2 A), so the control has no Mac access part. An automation has
 * no grants of its own.
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

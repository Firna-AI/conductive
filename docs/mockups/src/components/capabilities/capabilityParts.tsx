import type { ReactNode } from 'react'
import type { PersonKey } from '../../fixtures/members'
import type { WorkspaceGrants } from '../../fixtures/secretRequests'
import type { OrgSecret } from '../../fixtures/secrets'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { whoOf } from '../chat/SecretRun'
import { useMacApp } from '../mac/MacApp'
import {
  capabilitiesIntro,
  noSecrets,
  secretsPartWords,
} from './capabilitiesCopy'
import { CapabilitiesPanel, type CapabilityPart } from './CapabilitiesPanel'
import { GrantList } from './GrantList'
import { macAccessPart, type MacAccessView, type Shell } from './MacAccessPart'
import check from '../common/CheckOption.module.css'
import styles from './Capabilities.module.css'

/** What the Capabilities control shows for one workspace or one draft. */
export type CapabilitiesView = {
  /**
   * New workspace, or a workspace that exists. The control of an automation
   * has its own parts, from `automationCapabilityParts`.
   */
  place: Exclude<keyof typeof capabilitiesIntro, 'automation'>
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
  /** The title of the session that the control opens from, if any. */
  session?: string
  macAccess: MacAccessView
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
  'org' | 'secrets' | 'preApproved' | 'secretsTo'
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
 * links to its Secrets tab.
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
  return (
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
  )
}

/**
 * The grants that the control shows: the approvals of the open session
 * whose secret the workspace does not already allow, by a check or for all
 * agents, and each value for the workspace. A hidden approval stays, and it
 * shows again after an uncheck.
 */
function shownGrants(
  view: CapabilitiesView,
  grants: WorkspaceGrants,
): WorkspaceGrants {
  const allowed = (name: string) =>
    view.preApproved.includes(name) ||
    view.secrets.some((secret) => secret.name === name && secret.allAgents)
  return {
    approvals: grants.approvals.filter(
      (approval) =>
        approval.session === view.session && !allowed(approval.secret),
    ),
    values: grants.values,
  }
}

function SecretsContent(props: { view: CapabilitiesView }) {
  const { view } = props
  return (
    <>
      <SecretPicker view={view} />
      {view.grants ? (
        <GrantList
          grants={shownGrants(view, view.grants)}
          who={(person) => whoOf(person, view.viewer).object}
        />
      ) : null}
    </>
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
 * the workspace pre-approves, with its grants, and Mac access, with the
 * words of the shell that shows the control.
 */
function capabilityParts(
  view: CapabilitiesView,
  shell: Shell,
): CapabilityPart[] {
  return [
    secretsPart(view, secretsPartWords.hint, <SecretsContent view={view} />),
    macAccessPart(view.macAccess, view.place, shell),
  ]
}

/**
 * The Capabilities control of New workspace or of a workspace, drawn open.
 * It chooses its words by the shell, not by a pairing of this Mac: the Mac
 * app shows the line of this Mac, and a browser a note in its place (Mac
 * access decision 5 A). A sheet on a phone has its own title.
 */
export function OpenCapabilities(props: {
  view: CapabilitiesView
  sheet: boolean
}) {
  const shell: Shell = useMacApp() === undefined ? 'browser' : 'mac-app'
  return (
    <CapabilitiesPanel
      intro={capabilitiesIntro[props.view.place]}
      parts={capabilityParts(props.view, shell)}
      sheet={props.sheet}
    />
  )
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

import type { ReactNode } from 'react'
import type { PersonKey } from '../../fixtures/members'
import type { WorkspaceGrants } from '../../fixtures/secretRequests'
import type { OrgSecret } from '../../fixtures/secrets'
import { noop } from '../../../../../src/ui/noop'
import { ScreenLink } from '../common/ScreenLink'
import { SearchField } from '../common/SearchField'
import { whoOf } from '../chat/SecretRun'
import { useMacApp } from '../../../../../src/ui/components/mac/MacApp'
import {
  capabilitiesIntro,
  noSecretMatch,
  noSecrets,
  secretsPartWords,
} from '../../../../../src/ui/components/capabilities/capabilitiesCopy'
import {
  CapabilitiesPanel,
  type CapabilityPart,
} from '../../../../../src/ui/components/capabilities/CapabilitiesPanel'
import { GrantList } from './GrantList'
import { macAccessPart, type MacAccessView } from './MacAccessPart'
import {
  matchingSecrets,
  needsSecretSearch,
} from '../../../../../src/ui/components/capabilities/secretSearch'
import { SecretOption } from '../../../../../src/ui/components/capabilities/SecretOption'
import styles from '../../../../../src/ui/components/capabilities/Capabilities.module.css'

/** Where the control shows: in the Mac app, or in a browser. */
type Shell = 'mac-app' | 'browser'

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
   * The text in the search field, which shows above more than ten secrets.
   * It narrows the list by name and by description.
   */
  search?: string
  /** The name of the secret whose description shows under its name. */
  info?: string
  /**
   * The approvals of the sessions and the values for the workspace, which
   * only a workspace that exists has.
   */
  grants?: WorkspaceGrants
  /** The title of the session that the control opens from, if any. */
  session?: string
  /** The switch of Mac access of this Mac, which only the Mac app shows. */
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
  'org' | 'secrets' | 'preApproved' | 'search' | 'info' | 'secretsTo'
>

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
        <SecretOption
          change={noop}
          checked={view.preApproved.includes(secret.name)}
          disabled={false}
          infoOpen={view.info === secret.name}
          key={secret.name}
          secret={secret}
          toggleInfo={noop}
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
 * The secrets part, with its content and an optional hint. Manage secrets
 * opens the Secrets tab, while the org has secrets.
 */
function secretsPart(
  view: SecretsView,
  hint: string | undefined,
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
 * the workspace pre-approves, with its grants, and then Mac access, only
 * in the Mac app.
 */
function capabilityParts(
  view: CapabilitiesView,
  shell: Shell,
): CapabilityPart[] {
  const secrets = secretsPart(view, undefined, <SecretsContent view={view} />)
  if (shell === 'browser') return [secrets]
  return [secrets, macAccessPart(view.macAccess)]
}

/**
 * The Capabilities control of New workspace or of a workspace, drawn open.
 * It chooses its parts by the shell, not by a pairing of this Mac. The Mac
 * app shows the switch of Mac access of this Mac. A browser shows no Mac
 * access part, because only the page of the Mac app on that Mac starts a
 * grant (Mac access decisions 5 A and 7). A sheet on a phone has its own
 * title.
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

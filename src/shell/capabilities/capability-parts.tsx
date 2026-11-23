import type { ReactNode } from 'react'
import { secretsPartWords } from '../../ui/components/capabilities/capabilitiesCopy'
import type { CapabilityPart } from '../../ui/components/capabilities/CapabilitiesPanel'
import styles from '../../ui/components/capabilities/Capabilities.module.css'
import { routes } from '../../app/router'
import type { Loadable } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import type { OrgSecret } from '../../shared/secrets'
import { AppLink } from '../ui/AppLink'
import { macAccessPart, type MacSwitchView } from './MacAccessPart'
import { SecretPicker } from './SecretPicker'

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
  /**
   * The switch of Mac access of this Mac, which only the Mac app shows, or
   * null in a browser, which shows no Mac access part, because a browser
   * cannot change what runs on a Mac (Mac access decision 7). The control
   * chooses by where it runs, not by a pairing, so the Mac app with no
   * device connection still shows the switch.
   */
  macAccess: MacSwitchView | null
  /** The secrets take no change, such as while a create or a change runs. */
  disabled: boolean
  /**
   * The approvals of the open session and the values for the workspace,
   * each with Remove, which only a workspace that exists has.
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

function SecretsContent(props: { view: CapabilitiesView }) {
  const { view } = props
  return (
    <>
      <SecretPicker view={view} />
      {view.grants}
    </>
  )
}

/**
 * The secrets part, with its content and an optional hint. Manage secrets opens the
 * Secrets tab of the org settings, while the org has secrets.
 */
function secretsPart(
  view: SecretsView,
  hint: string | undefined,
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
 * the workspace pre-approves, with its grants, and then Mac access, only
 * in the Mac app. Later features, such as MCP servers, add their own parts
 * here.
 */
export function capabilityParts(view: CapabilitiesView): CapabilityPart[] {
  const secrets = secretsPart(view, undefined, <SecretsContent view={view} />)
  if (view.macAccess === null) return [secrets]
  return [secrets, macAccessPart(view.macAccess)]
}

/**
 * The parts of the Capabilities control of an automation: only the secrets
 * that each run workspace pre-approves (automation capabilities decision
 * 1 A), with their own hint. The control has no Mac access part, because no
 * person watches the Mac of the owner during a run (decision 2 A). An
 * automation has no grants of its own.
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

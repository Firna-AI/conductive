import type { ReactNode } from 'react'
import { Switch } from '@firna/ui/switch'
import { BrowserNote } from '../../../docs/mockups/src/components/capabilities/BrowserNote'
import {
  macAccessWords,
  secretsPartWords,
  thisMacWords,
} from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import type { CapabilityPart } from '../../../docs/mockups/src/components/capabilities/CapabilitiesPanel'
import styles from '../../../docs/mockups/src/components/capabilities/Capabilities.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { routes } from '../../app/router'
import type { Loadable } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import type { OrgSecret } from '../../shared/secrets'
import { AppLink } from '../ui/AppLink'
import { SecretPicker } from './SecretPicker'
import { ThisMacCheck, type ThisMacLineView } from './ThisMacLine'

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
  /**
   * The line of this Mac, which the Mac app shows under the switch while
   * Mac access is on, or null in a browser, which shows a note in its
   * place. The control chooses by where it runs, not by a pairing, so the
   * Mac app with no device connection still shows the line.
   */
  line: ThisMacLineView | null
  /** The controls take no change, such as while a create or a change runs. */
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
 * Whether the switch of Mac access takes no change: while the controls
 * take none, and while Mac access is off and a change of the grant of this
 * Mac waits, such as the Stop of a switch-off. A start does not go while
 * that change waits, so a switch-on then would save Mac access and start
 * no grant. A switch-off never waits, so a change that waits never keeps
 * the member from turning Mac access off. A start that a switch-off took
 * back no longer waits, so it never keeps the switch from a switch-on.
 */
function switchLocked(view: CapabilitiesView): boolean {
  if (view.disabled) return true
  return view.macAccess === false && view.line !== null && view.line.busy
}

/**
 * The Mac access part: the shared switch, and while it is on, the line of
 * this Mac in the Mac app or the note of a browser. While the switch is
 * off, the hint of the Mac app adds that turning it on also allows all
 * commands on this Mac (Mac access decision 1 C).
 */
function macAccessPart(view: CapabilitiesView): CapabilityPart {
  const { line } = view
  let content: ReactNode = null
  if (view.macAccess === true) {
    content = line ? <ThisMacCheck line={line} /> : <BrowserNote />
  }
  return {
    key: 'mac-access',
    title: macAccessWords.title,
    hint:
      line !== null && view.macAccess === false
        ? thisMacWords.offHint
        : macAccessWords.hint,
    control:
      view.macAccess === null ? undefined : (
        <MacAccessSwitch
          change={view.setMacAccess}
          disabled={switchLocked(view)}
          on={view.macAccess}
        />
      ),
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
    secretsPart(view, undefined, <SecretsContent view={view} />),
    macAccessPart(view),
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

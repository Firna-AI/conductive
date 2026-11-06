import { KeyRound, RefreshCw, Trash2, TriangleAlert } from 'lucide-react'
import { acmeKey, boatKeyPreset, pastedKey } from '../../fixtures/boatKey'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { BoatKeyDetails, BoatKeyField, BoatLinks, makeKeyText } from './BoatKey'
import { Section } from './Section'
import { TabIntro } from './TabIntro'

/**
 * The Boat key of the org: saved and tested, not added yet, a first key
 * that failed its test, or a new key of another Boat account, which the
 * app refuses (decision 56).
 */
export const boatKeyStates = [
  'saved',
  'empty',
  'failed',
  'other-account',
] as const

export type BoatKeyState = (typeof boatKeyStates)[number]

function SaveButton() {
  return (
    <ScreenLink asChild to={paths.boatKey}>
      <ActionButton icon={KeyRound} tone="primary">
        Save and test
      </ActionButton>
    </ScreenLink>
  )
}

/**
 * The key in use, with the ways to replace it and to remove it. While the
 * form of a new key is open, the key keeps no actions.
 */
function SavedKeySection(props: { replacing: boolean }) {
  return (
    <Section
      actions={
        props.replacing ? undefined : (
          <>
            <ActionButton icon={RefreshCw}>Replace key</ActionButton>
            <ActionButton icon={Trash2} tone="danger">
              Remove key
            </ActionButton>
          </>
        )
      }
      status={<StatusText label="Tested" tone="success" />}
      title="Key"
    >
      <BoatKeyDetails saved={acmeKey} />
    </Section>
  )
}

/** The first key of the org, with the pages of Boat where it is made. */
function AddKeySection(props: { failed: boolean }) {
  return (
    <Section
      actions={<SaveButton />}
      description={makeKeyText}
      title="Add a key"
    >
      <BoatLinks />
      <BoatKeyField
        invalid={props.failed}
        value={props.failed ? pastedKey : undefined}
      />
      {props.failed ? (
        <Notice
          body={`Older keys with the ${boatKeyPreset} preset lack resume. Make a new key with the ${boatKeyPreset} preset, then save it here.`}
          icon={TriangleAlert}
          title="This key can't resume cloud computers"
          tone="danger"
        />
      ) : null}
    </Section>
  )
}

/**
 * A new key that reaches another Boat account. The app refuses it and
 * keeps the saved key, because the cloud computers of the org stay in the
 * account of the saved key (decision 56).
 */
function ReplaceKeySection(props: { org: string }) {
  return (
    <Section
      actions={
        <>
          <ScreenLink asChild to={paths.boatKey}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <SaveButton />
        </>
      }
      description="Make the new key in the Boat account of the saved key."
      title="Replace the key"
    >
      <BoatKeyField invalid value={pastedKey} />
      <Notice
        body={`The cloud computers of ${props.org} are in the Boat account of the saved key, and a key of another account can't reach them. Make the new key in that account. The saved key stays in use.`}
        icon={TriangleAlert}
        title="This key is for another Boat account"
        tone="danger"
      />
    </Section>
  )
}

/** The Boat key tab of the org settings, which only an admin sees. */
export function BoatKeyTab(props: { state: BoatKeyState; org: string }) {
  const { state } = props
  const saved = state === 'saved' || state === 'other-account'
  return (
    <>
      <TabIntro title="Boat key">
        Every cloud computer of {props.org} runs on the Boat account of this
        key, under the plan and the limits of that account.
      </TabIntro>
      {saved ? <SavedKeySection replacing={state === 'other-account'} /> : null}
      {state === 'other-account' ? <ReplaceKeySection org={props.org} /> : null}
      {saved ? null : <AddKeySection failed={state === 'failed'} />}
    </>
  )
}

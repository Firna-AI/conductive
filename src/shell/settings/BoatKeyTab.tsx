import { useEffect, useState } from 'react'
import { KeyRound, RefreshCw } from 'lucide-react'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { TabIntro } from '../../../docs/mockups/src/components/settings/TabIntro'
import type { OrgModel } from '../../app/org-model'
import { SecretForm } from '../../app/secret-form'
import { useServices } from '../../app/services'
import { boatKeyProblem, saveBoatKey } from '../../app/settings-actions'
import { useStore } from '../../app/store'
import { formatDate } from '../../app/time'
import type { BoatKeyStatus } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import {
  BoatKeyActions,
  BoatKeyField,
  BoatKeyProblemNotice,
  BoatLinks,
  makeKeyText,
} from '../keys/BoatKeyParts'
import { ActionButton } from '../ui/actions'
import { Loaded } from './LoadState'

type SavedKey = Extract<BoatKeyStatus, { configured: true }>

/**
 * The form of a new key. The Worker tests the key once, and the field is
 * empty after a save. A refused key stays in the field, and the saved key
 * stays in use (decision 56).
 */
function useKeyForm(model: OrgModel, saved: () => void) {
  const [form] = useState(() => new SecretForm())
  const submit = () => {
    void form
      .submit((key) => saveBoatKey(model, key))
      .then((done) => {
        if (done) saved()
      })
  }
  return { form, submit }
}

/**
 * Save and test, as the mockup draws it. A press on an empty field asks
 * for the key, and the button spins while the Worker tests the key.
 */
function SaveKeyButton(props: { form: SecretForm; submit: () => void }) {
  const state = useStore(props.form.state)
  return (
    <ActionButton
      busy={state.saving}
      icon={KeyRound}
      onPress={props.submit}
      tone="primary"
    >
      Save and test
    </ActionButton>
  )
}

/** Why Boat refused the key, after a save that failed. */
function KeyProblem(props: {
  form: SecretForm
  orgName: string
  actionsAbove: boolean
}) {
  const state = useStore(props.form.state)
  if (!state.error) return null
  return (
    <BoatKeyProblemNotice
      actionsAbove={props.actionsAbove}
      orgName={props.orgName}
      problem={boatKeyProblem(state.error)}
    />
  )
}

/** The first key of the org, with the pages of Boat where it is made. */
function AddKeySection(props: { org: OrgSummary; model: OrgModel }) {
  const { form, submit } = useKeyForm(props.model, () => undefined)
  return (
    <Section
      actions={<SaveKeyButton form={form} submit={submit} />}
      description={makeKeyText}
      title="Add a key"
    >
      <BoatLinks />
      <BoatKeyActions />
      <BoatKeyField form={form} submit={submit} />
      <KeyProblem actionsAbove form={form} orgName={props.org.name} />
    </Section>
  )
}

/** A new key, which must reach the Boat account of the saved key. */
function ReplaceKeySection(props: {
  org: OrgSummary
  model: OrgModel
  close: () => void
}) {
  const { form, submit } = useKeyForm(props.model, props.close)
  return (
    <Section
      actions={
        <>
          <ActionButton onPress={props.close}>Cancel</ActionButton>
          <SaveKeyButton form={form} submit={submit} />
        </>
      }
      description="Make the new key in the Boat account of the saved key."
      title="Replace the key"
    >
      <BoatKeyField form={form} submit={submit} />
      <KeyProblem actionsAbove={false} form={form} orgName={props.org.name} />
    </Section>
  )
}

/**
 * The key in use: its last four characters and the day it was saved. While
 * the form of a new key is open, the key keeps no actions.
 */
function SavedKeySections(props: {
  org: OrgSummary
  model: OrgModel
  saved: SavedKey
}) {
  const { timeZone } = useServices()
  const [replacing, setReplacing] = useState(false)
  const { lastFour, updatedAt } = props.saved
  return (
    <>
      <Section
        actions={
          replacing ? undefined : (
            <ActionButton icon={RefreshCw} onPress={() => setReplacing(true)}>
              Replace key
            </ActionButton>
          )
        }
        status={<StatusText label="Tested" tone="success" />}
        title="Key"
      >
        <DetailList
          rows={[
            {
              term: 'Key',
              value: lastFour ? `•••• ${lastFour}` : '••••',
              mono: true,
            },
            { term: 'Added', value: formatDate(updatedAt, timeZone) },
          ]}
        />
      </Section>
      {replacing ? (
        <ReplaceKeySection
          close={() => setReplacing(false)}
          model={props.model}
          org={props.org}
        />
      ) : null}
    </>
  )
}

/**
 * The Boat key tab, which only an admin sees (decision 46). Every cloud
 * computer of the org runs on the Boat account of this key.
 */
export function BoatKeyTab(props: { org: OrgSummary }) {
  const { org } = props
  const model = useOrgModel(org.id)
  const status = useStore(model.boatKey)
  useEffect(() => model.watch('boatKey'), [model])
  return (
    <>
      <TabIntro title="Boat key">
        {`Every cloud computer of ${org.name} runs on the Boat account of this key, under the plan and the limits of that account.`}
      </TabIntro>
      <Loaded
        failure="The Boat key did not load"
        retry={() => model.reload('boatKey')}
        value={status}
      >
        {(key) =>
          key.configured ? (
            <SavedKeySections model={model} org={org} saved={key} />
          ) : (
            <AddKeySection model={model} org={org} />
          )
        }
      </Loaded>
    </>
  )
}

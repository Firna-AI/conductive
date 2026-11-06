import { useEffect, useState, type ReactNode } from 'react'
import { KeyRound } from 'lucide-react'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import styles from '../../../docs/mockups/src/screens/GetStartedScreen.module.css'
import type { StepState } from '../../app/get-started'
import { SecretForm } from '../../app/secret-form'
import { boatKeyProblem, saveBoatKey } from '../../app/settings-actions'
import { useStore } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { LoadFailure } from '../ui/LoadFailure'
import { useApp, useOrgModel } from '../context'
import {
  BoatKeyActions,
  BoatKeyField,
  BoatLinks,
  BoatKeyProblemNotice,
  makeKeyText,
} from '../keys/BoatKeyParts'
import { ActionButton } from '../ui/actions'
import { DoneStatus, useRefreshSteps } from './stepParts'

const title = '3. Add your Boat key'

/** Get started names Boat, and says that users need their own account. */
function KeySection(props: { actions?: ReactNode; children?: ReactNode }) {
  return (
    <Section
      actions={props.actions}
      description={`You need your own Boat account, because your cloud computers run on it. ${makeKeyText}`}
      title={title}
    >
      <BoatLinks />
      <BoatKeyActions />
      {props.children}
    </Section>
  )
}

/** The key of the first org, by its last four characters only. */
function SavedText(props: { org: OrgSummary }) {
  const model = useOrgModel(props.org.id)
  const key = useStore(model.boatKey)
  useEffect(() => model.watch('boatKey'), [model])
  if (key.state === 'failed') {
    return (
      <LoadFailure
        error={key.error}
        retry={() => model.reload('boatKey')}
        title="The key didn't load"
      />
    )
  }
  if (key.state === 'loading' || !key.value.configured) return null
  const { lastFour } = key.value
  return (
    <SectionText>
      Saved for <span className={styles.strong}>{props.org.name}</span>
      {lastFour ? (
        <>
          , ending in <span className={styles.mono}>{lastFour}</span>
        </>
      ) : null}
      .
    </SectionText>
  )
}

/**
 * The field of the key, with Save and test. The Worker tests the key once,
 * then the steps load again. A refused key stays in the field, and the
 * notice says why.
 */
function KeyForm(props: { org: OrgSummary }) {
  const app = useApp()
  const refresh = useRefreshSteps()
  const [form] = useState(() => new SecretForm())
  const state = useStore(form.state)
  const submit = () => {
    void form
      .submit((key) => saveBoatKey(app.org(props.org.id), key))
      .then((saved) => {
        if (saved) refresh.run()
      })
  }
  return (
    <KeySection
      actions={
        <ActionButton
          busy={state.saving || refresh.pending}
          icon={KeyRound}
          onPress={submit}
          tone="primary"
        >
          Save and test
        </ActionButton>
      }
    >
      <BoatKeyField form={form} submit={submit} />
      {state.error ? (
        <BoatKeyProblemNotice
          orgName={props.org.name}
          problem={boatKeyProblem(state.error)}
        />
      ) : null}
    </KeySection>
  )
}

/**
 * The Boat key of the first org. The field opens once the org exists,
 * because the key belongs to the org.
 */
export function KeyStep(props: { state: StepState; org: OrgSummary | null }) {
  if (props.state === 'done') {
    return (
      <Section status={<DoneStatus label="Tested" />} title={title}>
        {props.org ? <SavedText org={props.org} /> : null}
      </Section>
    )
  }
  if (props.state === 'next' && props.org) return <KeyForm org={props.org} />
  return <KeySection />
}

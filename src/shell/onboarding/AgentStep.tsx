import { Section } from '../../ui/components/settings/Section'
import { getStartedCopy } from '../../ui/screens/getStartedCopy'
import { inOrgs, orgLoginOnly } from '../../app/default-logins'
import type { StepState } from '../../app/get-started'
import { useStore } from '../../app/store'
import { AgentList } from '../account/AgentList'
import { useApp } from '../context'
import { DoneStatus, useRefreshSteps } from './stepParts'

const copy = getStartedCopy.agent

/**
 * Connect Claude or Codex. As the next step, the form of the agent of the
 * default model opens, and it stays open until a login is saved. Before
 * that, Connect stays on, as the mockup draws it: a login belongs to the
 * person, not to the org, so it can come first. A connect loads the steps
 * again.
 *
 * A person with no login of their own, whose org login serves an agent,
 * needs none (org login decision 4). The step is then done with "Ready",
 * its words name the login of that org, and a line under the agent names
 * it, as on the account.
 */
export function AgentStep(props: { state: StepState }) {
  const app = useApp()
  const account = useStore(app.account.account)
  const orgs = useStore(app.orgs)
  const refresh = useRefreshSteps()
  const next = props.state === 'next'
  const initial = next ? (account?.defaultChoice.agent ?? null) : null
  const done = props.state === 'done'
  const org = done && account ? orgLoginOnly(inOrgs(account, orgs)) : null
  return (
    <Section
      description={org ? copy.orgDescription(org) : copy.description}
      status={
        done ? <DoneStatus label={org ? copy.orgDone : copy.done} /> : undefined
      }
      title={copy.title}
    >
      <AgentList
        closable={!next}
        connected={refresh.run}
        disabled={false}
        initial={initial}
        key={props.state}
        removable={false}
      />
    </Section>
  )
}

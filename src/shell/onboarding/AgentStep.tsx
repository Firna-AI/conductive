import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { getStartedCopy } from '../../../docs/mockups/src/screens/getStartedCopy'
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
 */
export function AgentStep(props: { state: StepState }) {
  const app = useApp()
  const account = useStore(app.account.account)
  const refresh = useRefreshSteps()
  const next = props.state === 'next'
  const initial = next ? (account?.defaultChoice.agent ?? null) : null
  return (
    <Section
      description={copy.description}
      status={
        props.state === 'done' ? <DoneStatus label={copy.done} /> : undefined
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

import { StateText } from '../own-computers/ComputerStatus'
import { stateLabels } from '../own-computers/ownComputerCopy'
import type { ComputerState } from '../own-computers/ownComputer'
import {
  Section,
  SectionText,
} from '../../../../../src/ui/components/settings/Section'
import styles from '../../../../../src/ui/components/operator/WorkspaceStates.module.css'

/**
 * The states that the operator counts. A computer that never connected,
 * while its code works or after it expired, counts as one state.
 */
const counted = [
  'connected',
  'full',
  'offline',
  'building',
  'build-failed',
  'waiting',
] as const satisfies readonly ComputerState[]

type CountedState = (typeof counted)[number]

/** The own computers of an org in each state, and its workspaces on them. */
export type OrgComputerCounts = {
  states: Readonly<Record<CountedState, number>>
  /** The workspaces of the org that run on its own computers now. */
  running: number
}

/** The word of each state, as the operator reads it. */
function labelOf(state: CountedState): string {
  return state === 'waiting' ? 'Never connected' : stateLabels[state]
}

/**
 * The own computers of an org on its operator page: how many it has in
 * each state, with the glyph of the state, and how many of its workspaces
 * run on them. A state with no computer stays quiet. The section shows no
 * name and no content of a computer. It imports no fixture, so the app can
 * use it too.
 */
export function OwnComputerCounts(props: { counts: OrgComputerCounts }) {
  const { states, running } = props.counts
  const total = counted.reduce((sum, state) => sum + states[state], 0)
  return (
    <Section
      description={`${total} own ${total === 1 ? 'computer' : 'computers'}`}
      title="Own computers"
    >
      <ul aria-label="Own computers by state" className={styles.list}>
        {counted.map((state) => (
          <li className={styles.row} key={state}>
            <span className={styles.label}>
              <StateText
                label={labelOf(state)}
                quiet={states[state] === 0}
                state={state}
              />
            </span>
            <span className={styles.count}>
              {states[state].toLocaleString('en')}
            </span>
          </li>
        ))}
      </ul>
      <SectionText muted>
        {`${running.toLocaleString('en')} ${running === 1 ? 'workspace runs' : 'workspaces run'} on them now.`}
      </SectionText>
    </Section>
  )
}

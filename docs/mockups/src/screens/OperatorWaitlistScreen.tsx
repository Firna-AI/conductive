import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ApproveDialog } from '../components/operator/ApproveDialog'
import {
  DirectorySearch,
  DirectoryTable,
} from '../components/operator/directory'
import { OperatorPage } from '../components/operator/OperatorPage'
import {
  EmptyWaitlist,
  waitlistCell,
  waitlistColumns,
} from '../components/operator/waitlist'
import {
  approvedNow,
  samOkafor,
  waitlist,
  waitlistSearch,
  waitlistTotal,
  type ApprovalEmail,
} from '../fixtures/operatorWaitlist'
import { paths } from '../paths'

export const operatorWaitlistSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'dialog', 'signUps', 'waitlist'],
  properties: {
    /**
     * The people who wait, oldest first, a search, the list after two
     * approvals in this visit, or nobody.
     */
    list: { enum: ['oldest', 'search', 'approved', 'empty'] },
    /** The question before an approval, over the list. */
    dialog: { enum: ['none', 'approve'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
    /** The waitlist is on, or an operator turned it off. */
    waitlist: { enum: ['on', 'off'] },
  },
} as const

export type OperatorWaitlistState = SchemaProps<typeof operatorWaitlistSchema>

const none: Readonly<Record<string, ApprovalEmail>> = {}

/** The query, the rows, the line that counts them, and the approvals. */
function results(list: Exclude<OperatorWaitlistState['list'], 'empty'>) {
  switch (list) {
    case 'oldest':
      return {
        query: '',
        rows: waitlist,
        summary: `${waitlistTotal} people wait, oldest first.`,
        approved: none,
      }
    case 'search':
      return {
        ...waitlistSearch,
        summary: `${waitlistSearch.rows.length} people match “${waitlistSearch.query}”.`,
        approved: none,
      }
    case 'approved':
      return {
        query: '',
        rows: waitlist,
        summary: `${waitlistTotal - Object.keys(approvedNow).length} people wait, oldest first.`,
        approved: approvedNow,
      }
  }
}

function WaitlistBody(props: {
  list: Exclude<OperatorWaitlistState['list'], 'empty'>
  viewport: Viewport
}) {
  const found = results(props.list)
  return (
    <>
      <DirectorySearch
        label="Search the waitlist"
        placeholder="GitHub login, name, or GitHub ID"
        query={found.query}
      />
      <DirectoryTable
        cell={waitlistCell(props.viewport, found.approved)}
        columns={waitlistColumns}
        empty={`Nobody on the waitlist matches “${found.query}”.`}
        more={props.list !== 'search'}
        rowKey={(person) => person.login}
        rows={found.rows}
        summary={found.summary}
        title="Waitlist"
        viewport={props.viewport}
      />
    </>
  )
}

/**
 * The Waitlist tab of the operator: the people who wait for app access,
 * oldest first, with a search by GitHub login, name, or numeric GitHub ID.
 * Each login opens the GitHub profile of the person, and Approve asks
 * first.
 */
export function OperatorWaitlistScreen(props: {
  state: OperatorWaitlistState
  viewport: Viewport
}) {
  const { list, dialog, signUps, waitlist } = props.state
  return (
    <OperatorPage
      dialog={
        dialog === 'approve' ? (
          <ApproveDialog
            cancel={paths.operatorWaitlist}
            done={paths.operatorWaitlistApproved}
            person={samOkafor}
            viewport={props.viewport}
          />
        ) : null
      }
      signUps={signUps}
      tab="waitlist"
      title="Operator"
      viewport={props.viewport}
      waitlist={waitlist}
    >
      {list === 'empty' ? (
        <EmptyWaitlist />
      ) : (
        <WaitlistBody list={list} viewport={props.viewport} />
      )}
    </OperatorPage>
  )
}

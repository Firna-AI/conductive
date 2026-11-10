import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Plus } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import {
  DisableCodeDialog,
  NewCodeDialog,
} from '../components/operator/codeDialogs'
import { codeCell, codeColumns } from '../components/operator/codes'
import {
  DirectorySearch,
  DirectoryTable,
} from '../components/operator/directory'
import { OperatorPage } from '../components/operator/OperatorPage'
import { PauseDialog, SignUpsSection } from '../components/operator/pause'
import { TurnOffWaitlistDialog } from '../components/operator/waitlistSwitch'
import {
  codeSearches,
  inviteCodes,
  meetupLisbon,
  newCode,
  type CodeRow,
} from '../fixtures/operatorCodes'
import { paths } from '../paths'

export const operatorCodesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'dialog', 'signUps', 'waitlist'],
  properties: {
    /**
     * The invite codes newest first, after New code, after a disable, or
     * a search that finds an invite code, a referral code, or nothing.
     */
    list: {
      enum: ['newest', 'made', 'disabled', 'invite', 'referral', 'none'],
    },
    /**
     * New code, or the question before a disable, the pause, or Turn off
     * the waitlist.
     */
    dialog: {
      enum: ['none', 'new', 'disable', 'pause', 'turn-off-waitlist'],
    },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
    /** The waitlist is on, or an operator turned it off. */
    waitlist: { enum: ['on', 'off'] },
  },
} as const

export type OperatorCodesState = SchemaProps<typeof operatorCodesSchema>

type Results = {
  title: string
  query: string
  rows: readonly CodeRow[]
  summary: string
}

/** The invite codes, newest first, with a count. */
function listOf(rows: readonly CodeRow[]): Results {
  return {
    title: 'Invite codes',
    query: '',
    rows,
    summary: `${rows.length} invite codes, newest first.`,
  }
}

/** The title, the query, the rows, and the line that counts them. */
function results(list: OperatorCodesState['list']): Results {
  switch (list) {
    case 'newest':
      return listOf(inviteCodes)
    case 'made':
      return listOf([newCode, ...inviteCodes])
    case 'disabled':
      return listOf(
        inviteCodes.map((row) =>
          row.code === meetupLisbon.code ? { ...row, disabled: true } : row,
        ),
      )
    case 'invite':
      return {
        ...codeSearches.invite,
        title: 'Codes',
        summary: '1 invite code matches.',
      }
    case 'referral':
      return {
        ...codeSearches.referral,
        title: 'Codes',
        summary: '1 referral code matches.',
      }
    case 'none':
      return {
        ...codeSearches.none,
        title: 'Codes',
        summary:
          'Search by a code, the label of an invite code, or the GitHub login of an owner.',
      }
  }
}

/**
 * The dialog over the tab. The question before the pause keeps the state of
 * the waitlist switch in its links.
 */
function CodesDialog(props: {
  dialog: OperatorCodesState['dialog']
  waitlist: OperatorCodesState['waitlist']
  viewport: Viewport
}) {
  switch (props.dialog) {
    case 'none':
      return null
    case 'new':
      return <NewCodeDialog viewport={props.viewport} />
    case 'disable':
      return (
        <DisableCodeDialog
          cancel={paths.operatorCodes}
          code={meetupLisbon.code}
          done={paths.operatorCodesDisabled}
          kind="invite"
          title={`Disable ${meetupLisbon.label}?`}
          used={meetupLisbon.uses}
          viewport={props.viewport}
        />
      )
    case 'pause':
      return <PauseDialog viewport={props.viewport} waitlist={props.waitlist} />
    case 'turn-off-waitlist':
      return <TurnOffWaitlistDialog viewport={props.viewport} />
  }
}

/**
 * The Invite codes tab of the operator: the state of sign-ups with Pause
 * sign-ups and the waitlist switch, a search, and the invite codes, newest
 * first, with their uses and states. The search finds a code by its text,
 * an invite code by its label, and a referral code by the GitHub login of
 * its owner. New code in the header makes a code.
 */
export function OperatorCodesScreen(props: {
  state: OperatorCodesState
  viewport: Viewport
}) {
  const { list, dialog, signUps, waitlist } = props.state
  const found = results(list)
  return (
    <OperatorPage
      actions={
        <ScreenLink asChild to={paths.operatorCodesNew}>
          <ActionButton icon={Plus} tone="primary">
            New code
          </ActionButton>
        </ScreenLink>
      }
      dialog={
        <CodesDialog
          dialog={dialog}
          viewport={props.viewport}
          waitlist={waitlist}
        />
      }
      signUps={signUps}
      tab="codes"
      title="Operator"
      viewport={props.viewport}
      waitlist={waitlist}
    >
      {signUps === 'open' ? <SignUpsSection waitlist={waitlist} /> : null}
      <DirectorySearch
        label="Search codes"
        placeholder="Code, label, or GitHub login"
        query={found.query}
      />
      <DirectoryTable
        cell={codeCell(props.viewport)}
        columns={codeColumns}
        empty={`No code matches “${found.query}”.`}
        more={false}
        rowKey={(row) => row.code}
        rows={found.rows}
        summary={found.summary}
        title={found.title}
        viewport={props.viewport}
      />
    </OperatorPage>
  )
}

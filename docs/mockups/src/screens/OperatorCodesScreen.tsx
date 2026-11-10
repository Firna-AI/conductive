import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Plus } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { SearchField } from '../components/common/SearchField'
import {
  DisableCodeDialog,
  NewCodeDialog,
} from '../components/operator/codeDialogs'
import { codeCell, codeColumns } from '../components/operator/codes'
import { DirectoryTable } from '../components/operator/directory'
import { OperatorPage } from '../components/operator/OperatorPage'
import { PauseDialog, SignUpsSection } from '../components/operator/pause'
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
  required: ['list', 'dialog', 'signUps'],
  properties: {
    /**
     * The invite codes newest first, after New code, after a disable, or
     * a search that finds an invite code, a referral code, or nothing.
     */
    list: {
      enum: ['newest', 'made', 'disabled', 'invite', 'referral', 'none'],
    },
    /** New code, or the question before a disable or the pause. */
    dialog: { enum: ['none', 'new', 'disable', 'pause'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
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

function CodesDialog(props: {
  dialog: OperatorCodesState['dialog']
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
      return <PauseDialog viewport={props.viewport} />
  }
}

/**
 * The Invite codes tab of the operator: the state of sign-ups with Pause,
 * a search, and the invite codes, newest first, with their uses and
 * states. The search finds a code by its text, an invite code by its
 * label, and a referral code by the GitHub login of its owner. New code in
 * the header makes a code.
 */
export function OperatorCodesScreen(props: {
  state: OperatorCodesState
  viewport: Viewport
}) {
  const { list, dialog, signUps } = props.state
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
      dialog={<CodesDialog dialog={dialog} viewport={props.viewport} />}
      signUps={signUps}
      tab="codes"
      title="Operator"
      viewport={props.viewport}
    >
      {signUps === 'open' ? <SignUpsSection /> : null}
      <SearchField
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

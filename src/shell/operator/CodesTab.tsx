import { useState } from 'react'
import { Ban, Plus } from 'lucide-react'
import { TableCell, type TableColumn } from '@firna/ui/table'
import {
  disableLabel,
  newCodeWords,
  referralCodeLabel,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import styles from '../../../docs/mockups/src/components/operator/codes.module.css'
import { readCodesPage } from '../../app/api/read-operator-waitlist'
import { useNavigation } from '../../app/navigation'
import { disableCode, makeInviteCode } from '../../app/operator-access'
import {
  OperatorDirectory,
  type DirectoryResult,
} from '../../app/operator-directory'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import {
  operatorCodesPath,
  type CreateOperatorCodeRequest,
  type OperatorAccessCode,
} from '../../shared/operator-waitlist'
import { useApp } from '../context'
import { ActionButton, IconButton } from '../ui/actions'
import { useViewport, type Viewport } from '../ui/viewport'
import { DisableCodeDialog, NewCodeDialog } from './CodeDialogs'
import { codeName, CodeStateText, CopyableCode } from './CodeParts'
import { DirectoryList, type DirectoryKind } from './DirectoryList'
import { counted, formatShortDay } from './format'
import { OperatorPage } from './OperatorPage'
import { SignUpsBox } from './PauseParts'
import { SearchField } from './SearchField'
import { InlineLink, Joined } from './TargetParts'

type Code = OperatorAccessCode

/**
 * A phone keeps the label, the uses, and Disable. It puts the code with
 * its copy buttons under the label, and the state under the uses. It
 * leaves out who made an invite code and the day.
 */
const columns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'label', label: 'Label', flex: 1 },
    { key: 'code', label: 'Code', width: 148 },
    { key: 'state', label: 'State', width: 92 },
    { key: 'uses', label: 'Uses', align: 'right', width: 72 },
    { key: 'disable', align: 'right', width: 44 },
  ],
  phone: [
    { key: 'label', label: 'Label', flex: 1 },
    { key: 'uses', label: 'Uses', align: 'right', width: 72 },
    { key: 'disable', align: 'right', width: 44 },
  ],
}

/**
 * The line above the rows. A search names the kind of code that it found,
 * when every match is of one kind.
 */
function summaryOf(result: DirectoryResult<Code>): string {
  const { total, search } = result
  if (search === '') {
    return `${counted(total, 'invite code', 'invite codes')}, newest first.`
  }
  const kinds = new Set(result.rows.map((row) => row.kind))
  const whole = result.nextCursor === null && result.rows.length === total
  const [only] = kinds
  const noun =
    !whole || kinds.size !== 1
      ? counted(total, 'code', 'codes')
      : counted(total, `${only} code`, `${only} codes`)
  return `${noun} ${total === 1 ? 'matches' : 'match'}.`
}

/** The label of an invite code, and who made it and when. */
function InviteOrigin(props: { code: Code }) {
  const { now, timeZone } = useServices()
  const { createdBy, createdAt } = props.code
  return (
    <Joined
      parts={[
        createdBy ? `by @${createdBy.login}` : null,
        formatShortDay(createdAt, now(), timeZone),
      ]}
    />
  )
}

/**
 * The label of a code, or Referral code, and the line of its origin: who
 * made an invite code and when, or whose referral code it is, as a link to
 * the page of that user. A phone gives the code with its copy buttons under
 * the label, and keeps the origin only for a referral code.
 */
function LabelCell(props: { code: Code; phone: boolean }) {
  const { code, phone } = props
  const origin =
    code.kind === 'invite' ? (
      phone ? null : (
        <InviteOrigin code={code} />
      )
    ) : code.owner ? (
      <>
        of{' '}
        <InlineLink to={routes.operatorUser(code.owner.githubId)}>
          @{code.owner.login}
        </InlineLink>
      </>
    ) : null
  return (
    <span className={styles.labelCell}>
      <span className={styles.label}>
        {code.kind === 'invite' ? (code.label ?? code.code) : referralCodeLabel}
      </span>
      {phone ? (
        <CopyableCode code={code.code} works={code.state === 'active'} />
      ) : null}
      {origin ? <span className={styles.origin}>{origin}</span> : null}
    </span>
  )
}

/**
 * The Invite codes tab of the operator: the Sign-ups box with Pause
 * sign-ups, a search, and the invite codes, newest first, with their uses
 * and states. The search finds a code by its text, an invite code by its
 * label, and a referral code by the GitHub login of its owner. New code in
 * the header makes a code, which then leads the list. Disable asks first.
 */
export function CodesTab(props: { search: string }) {
  const app = useApp()
  const navigation = useNavigation()
  const phone = useViewport() === 'phone'
  const [directory] = useState(
    () =>
      new OperatorDirectory(
        app,
        operatorCodesPath,
        readCodesPage,
        (row) => row.code,
      ),
  )
  const [making, setMaking] = useState(false)
  const [disabling, setDisabling] = useState<Code | null>(null)
  const { result } = useStore(directory.state)
  const make = async (request: CreateOperatorCodeRequest) => {
    await makeInviteCode(app, request)
    if (props.search === '') void directory.reload()
    else navigation.replace(routes.operatorCodes())
  }
  const disable = (code: Code) =>
    directory.write(
      code,
      () => disableCode(app, code.code),
      (changed) => () => changed,
    )
  const cell = (row: Code, key: string) => {
    const uses = `${row.uses} of ${row.useLimit}`
    switch (key) {
      case 'label':
        return <LabelCell code={row} phone={phone} />
      case 'code':
        return <CopyableCode code={row.code} works={row.state === 'active'} />
      case 'state':
        return <CodeStateText state={row.state} />
      case 'uses':
        if (!phone) return <TableCell numeric>{uses}</TableCell>
        return (
          <span className={styles.usesCell}>
            <span className={styles.uses}>{uses}</span>
            <CodeStateText state={row.state} />
          </span>
        )
      default:
        if (row.state !== 'active') {
          return <span aria-hidden className={styles.noAction} />
        }
        return (
          <IconButton
            icon={Ban}
            label={disableLabel(codeName(row))}
            onPress={() => setDisabling(row)}
            quiet
          />
        )
    }
  }
  const searched = (result?.search ?? props.search) !== ''
  const kind: DirectoryKind<Code> = {
    title: searched ? 'Codes' : 'Invite codes',
    one: 'invite code',
    many: 'invite codes',
    keys: 'Search by a code, the label of an invite code, or the GitHub login of an owner.',
    columns,
    summary: summaryOf,
    noMatch: (search) => `No code matches “${search}”.`,
  }
  return (
    <OperatorPage
      actions={
        <ActionButton
          icon={Plus}
          onPress={() => setMaking(true)}
          tone="primary"
        >
          {newCodeWords.action}
        </ActionButton>
      }
      tab="codes"
      title="Operator"
    >
      <SignUpsBox />
      <SearchField
        address={routes.operatorCodes}
        label="Search codes"
        placeholder="Code, label, or GitHub login"
        search={props.search}
      />
      <DirectoryList
        cell={cell}
        directory={directory}
        kind={kind}
        search={props.search}
      />
      {making ? (
        <NewCodeDialog close={() => setMaking(false)} make={make} />
      ) : null}
      {disabling ? (
        <DisableCodeDialog
          close={() => setDisabling(null)}
          code={disabling}
          disable={() => disable(disabling)}
        />
      ) : null}
    </OperatorPage>
  )
}

import { Ban } from 'lucide-react'
import { productName } from '../../brand'
import type {
  ApprovalEmailNote,
  AppAccess,
  ReferralCode,
  WayIn,
} from '../../fixtures/operatorAccess'
import { codeState } from '../../fixtures/operatorCodes'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { DetailList, type Detail } from '../settings/DetailList'
import { Section, SectionText } from '../settings/Section'
import { CodeStateText } from './codes'
import { InlineLink, TargetList, TargetRow } from './targets'

/** How the user got app access, with a link to the code, the owner, or the org. */
function WayInText(props: { way: WayIn }) {
  const { way } = props
  switch (way.kind) {
    case 'approval':
      return <>Approved by @{way.by}</>
    case 'invite-code':
      return (
        <>
          Invite code{' '}
          <InlineLink to={paths.operatorCodesSearch}>{way.label}</InlineLink>
        </>
      )
    case 'referral-code':
      return (
        <>
          Referral code of{' '}
          <InlineLink to={paths.operatorUser}>@{way.owner}</InlineLink>
        </>
      )
    case 'org-invitation':
      return (
        <>
          Org invitation to{' '}
          <InlineLink to={paths.operatorOrg}>{way.org}</InlineLink>
        </>
      )
    case 'operator':
      return <>As an operator</>
    case 'existing':
      return <>Joined before the waitlist</>
  }
}

/** Whether the approval email went. A late one goes again on its own. */
function emailText(email: ApprovalEmailNote): string {
  if (email.state === 'sent') return `Sent on ${email.at}`
  return `Not sent yet. ${productName} tries again on its own.`
}

/**
 * How and when the user got app access. After an approval, it also says
 * whether the approval email went.
 */
export function AppAccessSection(props: {
  access: Extract<AppAccess, { state: 'granted' }>
}) {
  const { since, way } = props.access
  const rows: Detail[] = [
    { term: 'How', value: <WayInText way={way} /> },
    { term: 'Since', value: since },
  ]
  if (way.kind === 'approval') {
    rows.push({ term: 'Approval email', value: emailText(way.email) })
  }
  return (
    <Section title="App access">
      <DetailList rows={rows} />
    </Section>
  )
}

/** The page drawn for a person who used the code. Others open Dana Kim. */
function pageOf(login: string): string {
  return login === 'tide-sam'
    ? paths.operatorUserReferralCode
    : paths.operatorUser
}

/**
 * The referral code of the user: the code, its uses, the people who used
 * it with the day each came in, and Disable while it still works. The
 * user sees only the uses left, and the operator also sees who used them.
 */
export function ReferralSection(props: {
  code: ReferralCode
  /** The question before the disable, for the page that draws it. */
  disable?: string
}) {
  const { code } = props
  const state = codeState({
    code: code.code,
    uses: code.usedBy.length,
    limit: code.limit,
    disabled: code.disabled !== undefined,
  })
  const rows: Detail[] = [
    { term: 'Code', value: code.code, mono: true },
    { term: 'Uses', value: `${code.usedBy.length} of ${code.limit} used` },
  ]
  if (code.disabled) {
    rows.push({
      term: 'Disabled',
      value: `${code.disabled.on} by @${code.disabled.by}`,
    })
  }
  const button = (
    <ActionButton icon={Ban} tone="danger">
      Disable code
    </ActionButton>
  )
  const action = props.disable ? (
    <ScreenLink asChild to={props.disable}>
      {button}
    </ScreenLink>
  ) : (
    button
  )
  return (
    <Section
      actions={state === 'active' ? action : undefined}
      status={<CodeStateText state={state} />}
      title="Referral code"
    >
      <DetailList rows={rows} />
      {code.usedBy.length > 0 ? (
        <>
          <SectionText muted>Used by</SectionText>
          <TargetList label={`People who used ${code.code}`}>
            {code.usedBy.map((use) => (
              <TargetRow
                detail={use.name}
                end={use.day}
                key={use.login}
                target={{
                  kind: 'user',
                  name: use.login,
                  initials: use.initials,
                }}
                to={pageOf(use.login)}
              />
            ))}
          </TargetList>
        </>
      ) : null}
    </Section>
  )
}

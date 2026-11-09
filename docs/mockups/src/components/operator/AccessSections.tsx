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
import { CodeStateText, CopyableCode } from './codes'
import { InlineLink, TargetList, TargetRow } from './targets'
import styles from './AccessSections.module.css'

/**
 * How the user got app access, with a link to the code or its owner. An
 * org invitation links to the org and to the admin who sent it.
 */
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
          <InlineLink to={paths.operatorOrg}>{way.org}</InlineLink> from{' '}
          <InlineLink to={paths.operatorUser}>@{way.by}</InlineLink>
        </>
      )
    case 'operator':
      return <>As an operator</>
    case 'existing':
      return <>Joined before the waitlist</>
  }
}

/** A state, with a short muted line under it that says why. */
function StateWithReason(props: { state: string; reason: string }) {
  return (
    <span className={styles.lines}>
      {props.state}
      <span className={styles.reason}>{props.reason}</span>
    </span>
  )
}

/**
 * Whether the approval email went. A late one goes again on its own for 24
 * hours. One that never went says why. The person keeps app access and sees
 * it at their next visit, so no state asks for an action.
 */
function EmailState(props: { email: ApprovalEmailNote }) {
  const { email } = props
  switch (email.state) {
    case 'sent':
      return <>Sent on {email.at}</>
    case 'pending':
      return (
        <StateWithReason
          reason={`${productName} tries again on its own.`}
          state="Not sent yet"
        />
      )
    case 'not-sent':
      return (
        <StateWithReason
          reason={
            email.reason === 'no-verified-email'
              ? 'This GitHub account has no verified email.'
              : `${productName} stopped trying on ${email.on}.`
          }
          state="Not sent"
        />
      )
  }
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
    rows.push({
      term: 'Approval email',
      value: <EmailState email={way.email} />,
    })
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
 * The referral code of the user: the code with Copy and Copy join link,
 * its uses, the people who used it with the day each came in, and Disable
 * while it still works. The user sees only the uses left, and the
 * operator also sees who used them.
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
    {
      term: 'Code',
      value: <CopyableCode code={code.code} works={state === 'active'} />,
    },
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

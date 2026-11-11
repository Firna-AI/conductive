import { Ban } from 'lucide-react'
import {
  accessTerms,
  approvalEmailWords,
  referralWords,
  wayInWords,
} from '../../../docs/mockups/src/components/operator/accessCopy'
import styles from '../../../docs/mockups/src/components/operator/AccessSections.module.css'
import {
  disableCodeWords,
  referralCodeLabel,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import {
  DetailList,
  type Detail,
} from '../../../docs/mockups/src/components/settings/DetailList'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import type { OperatorUserDetail } from '../../shared/operator'
import type {
  OperatorAccessSource,
  OperatorApprovalEmail,
} from '../../shared/operator-waitlist'
import { ActionButton } from '../ui/actions'
import { CodeStateText, CopyableCode } from './CodeParts'
import { formatLongDay, formatLongMoment, formatShortDay } from './format'
import { InlineLink, TargetList, TargetRow } from './TargetParts'

/**
 * How the user got app access, with a link to what let them in: the codes
 * tab with the invite code, the owner of the referral code, or the org and
 * the admin of the invitation. An approval names its operator, and open
 * sign-up the operator who last turned off the waitlist. A record whose
 * operator, owner, or org no longer exists says so without a link.
 */
function WayIn(props: { source: OperatorAccessSource }) {
  const { source } = props
  switch (source.kind) {
    case 'approval':
      return source.operator
        ? wayInWords.approvedBy(source.operator.login)
        : 'Approved by an operator'
    case 'open_signup':
      return source.operator
        ? wayInWords.openSignUpBy(source.operator.login)
        : 'Open sign-up by an operator'
    case 'invite_code':
      return (
        <>
          {wayInWords.inviteCode}{' '}
          <InlineLink to={routes.operatorCodes(source.code)}>
            {source.label ?? source.code}
          </InlineLink>
        </>
      )
    case 'referral_code':
      return source.owner ? (
        <>
          {wayInWords.referralCodeOf}{' '}
          <InlineLink to={routes.operatorUser(source.owner.githubId)}>
            @{source.owner.login}
          </InlineLink>
        </>
      ) : (
        <>
          {referralCodeLabel}{' '}
          <InlineLink to={routes.operatorCodes(source.code)}>
            {source.code}
          </InlineLink>
        </>
      )
    case 'org_invitation':
      return (
        <>
          {wayInWords.orgInvitationTo}{' '}
          {source.org.name === null ? (
            'a deleted org'
          ) : (
            <InlineLink to={routes.operatorOrg(source.org.id)}>
              {source.org.name}
            </InlineLink>
          )}
          {source.invitedBy ? (
            <>
              {' '}
              {wayInWords.from}{' '}
              <InlineLink to={routes.operatorUser(source.invitedBy.githubId)}>
                @{source.invitedBy.login}
              </InlineLink>
            </>
          ) : null}
        </>
      )
    case 'operator':
      return wayInWords.operator
    case 'existing':
      return wayInWords.existing
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
 * hours, and one that never went says why. The person keeps app access, so
 * no state asks for an action.
 */
function EmailState(props: { email: OperatorApprovalEmail }) {
  const { now, timeZone } = useServices()
  const { state, updatedAt } = props.email
  switch (state) {
    case 'sent':
      return approvalEmailWords.sent(
        updatedAt === null ? null : formatLongMoment(updatedAt, timeZone),
      )
    case 'pending':
      return <StateWithReason {...approvalEmailWords.pending} />
    case 'none':
      return <StateWithReason {...approvalEmailWords.noVerifiedEmail} />
    case 'failed':
      return (
        <StateWithReason
          {...approvalEmailWords.stopped(
            updatedAt === null
              ? null
              : formatShortDay(updatedAt, now(), timeZone),
          )}
        />
      )
  }
}

/**
 * How and when the user got app access. An account from before the
 * waitlist gives its join day. After an approval, the section also says
 * whether the approval email went.
 */
export function AppAccessSection(props: { user: OperatorUserDetail }) {
  const { appAccess, approvalEmail } = props.user
  const { timeZone } = useServices()
  if (appAccess.state !== 'granted') return null
  const { source, grantedAt } = appAccess
  const rows: Detail[] = [
    { term: accessTerms.how, value: <WayIn source={source} /> },
    {
      term: accessTerms.since,
      value:
        source.kind === 'existing'
          ? formatLongDay(grantedAt, timeZone)
          : formatLongMoment(grantedAt, timeZone),
    },
  ]
  if (source.kind === 'approval') {
    rows.push({
      term: accessTerms.email,
      value: <EmailState email={approvalEmail} />,
    })
  }
  return (
    <Section title="App access">
      <DetailList rows={rows} />
    </Section>
  )
}

/**
 * The referral code of the user: the code with Copy and Copy join link
 * while it works, its uses, its disable, the people who used it with the
 * day each came in, and Disable code while it still lets people in. Each
 * person shows their login, and their name on GitHub under it when they
 * have one, and opens their page.
 */
export function ReferralSection(props: {
  user: OperatorUserDetail
  disable: () => void
}) {
  const { now, timeZone } = useServices()
  const code = props.user.referralCode
  if (!code) return null
  const works = code.state === 'active'
  const rows: Detail[] = [
    {
      term: referralWords.code,
      value: <CopyableCode code={code.code} works={works} />,
    },
    {
      term: referralWords.uses,
      value: referralWords.usesLine(code.uses, code.useLimit),
    },
  ]
  if (code.disabledAt !== null) {
    const on = formatLongMoment(code.disabledAt, timeZone)
    rows.push({
      term: referralWords.disabled,
      value: code.disabledBy
        ? referralWords.disabledLine(on, code.disabledBy.login)
        : on,
    })
  }
  return (
    <Section
      actions={
        works ? (
          <ActionButton icon={Ban} onPress={props.disable} tone="danger">
            {disableCodeWords.action}
          </ActionButton>
        ) : undefined
      }
      status={<CodeStateText state={code.state} />}
      title={referralWords.title}
    >
      <DetailList rows={rows} />
      {code.recipients.length > 0 ? (
        <>
          <SectionText muted>{referralWords.usedBy}</SectionText>
          <TargetList label={referralWords.usedByLabel(code.code)}>
            {code.recipients.map((recipient) => (
              <TargetRow
                detail={recipient.name ?? undefined}
                end={formatShortDay(recipient.usedAt, now(), timeZone)}
                key={recipient.githubId}
                target={{
                  kind: 'user',
                  login: recipient.login,
                  name: recipient.name,
                }}
                to={routes.operatorUser(recipient.githubId)}
              />
            ))}
          </TargetList>
        </>
      ) : null}
    </Section>
  )
}

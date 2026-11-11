import type { ColorScheme, Viewport } from '@mokly/mokly'
import { EmailFrame } from '../components/emails/EmailFrame'
import { approvalEmail } from '../emails/ApprovalEmail'
import { approvalWords } from '../emails/emailWords'
import { approval, emailLogo } from '../fixtures/emails'
import { waitingEmail } from '../fixtures/waitlist'

/** The approval email in the inbox of Sam, who waited for app access. */
export function ApprovalEmailScreen(props: {
  viewport: Viewport
  colorScheme: ColorScheme
}) {
  return (
    <EmailFrame
      colorScheme={props.colorScheme}
      email={approvalEmail(approval, emailLogo)}
      subject={approvalWords().subject}
      to={waitingEmail}
      viewport={props.viewport}
    />
  )
}

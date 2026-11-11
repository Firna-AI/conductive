import type { ColorScheme, SchemaProps, Viewport } from '@mokly/mokly'
import { EmailFrame } from '../components/emails/EmailFrame'
import { invitationWords } from '../emails/emailWords'
import { invitationEmail } from '../emails/InvitationEmail'
import { emailLogo, invitation, longInvitation } from '../fixtures/emails'

export const invitationEmailSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['invitation'],
  properties: {
    /**
     * The invitation of Acme from Cal, or one from an org with a long name,
     * by an admin whose GitHub account has no name.
     */
    invitation: { enum: ['acme', 'long-name'] },
  },
} as const

export type InvitationEmailState = SchemaProps<typeof invitationEmailSchema>

/** The org invitation in the inbox of the invited person. */
export function InvitationEmailScreen(props: {
  state: InvitationEmailState
  viewport: Viewport
  colorScheme: ColorScheme
}) {
  const values = props.state.invitation === 'acme' ? invitation : longInvitation
  return (
    <EmailFrame
      colorScheme={props.colorScheme}
      email={invitationEmail(values, emailLogo)}
      subject={invitationWords(values).subject}
      to={values.invitedEmail}
      viewport={props.viewport}
    />
  )
}

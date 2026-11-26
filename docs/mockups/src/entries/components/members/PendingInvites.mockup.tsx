import { defineComponent, type SchemaProps } from '@mokly/mokly'
import type { ActionTone } from '../../../../../../src/ui/components/common/actions'
import { ScreenLink } from '../../../components/common/ScreenLink'
import {
  PendingInviteList,
  type PendingInviteRow,
} from '../../../../../../src/ui/components/members/PendingInvites'
import { pendingInvites } from '../../../fixtures/members'
import { waitingInvites } from '../../../fixtures/waitlist'
import { inviteRows } from '../../../screens/inviteRows'
import { actionButton } from '../common/actions.mockup'

/** The tones of Accept invitation: the main action of a screen, or not. */
const acceptTones = [
  'primary',
  'secondary',
] as const satisfies readonly ActionTone[]

/**
 * One invite that waits as JSON, as `PendingInviteRow` with the data of
 * its Accept invitation in place of the button.
 */
const inviteRowSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'orgName', 'email', 'accept'],
  properties: {
    /** The key of the org, in kebab-case. */
    id: { type: 'string', minLength: 1 },
    orgName: { type: 'string' },
    /** The verified email that the invite names. */
    email: { type: 'string' },
    /** Accept invitation: its tone, and the screen of the org it opens. */
    accept: {
      type: 'object',
      additionalProperties: false,
      required: ['tone'],
      properties: {
        tone: { enum: acceptTones },
        to: { type: 'string', minLength: 1 },
      },
    },
  },
} as const

/** One invite that waits, as the data of the registered list. */
export type PendingInviteData = SchemaProps<typeof inviteRowSchema>

/** The row of the list, with Accept invitation, which joins the org. */
function rowOf(invite: PendingInviteData): PendingInviteRow {
  const button = (
    <actionButton.Component
      accessibilityLabel={`Accept the invitation to ${invite.orgName}`}
      moklyInstance={`accept-${invite.id}`}
      tone={invite.accept.tone}
    >
      Accept invitation
    </actionButton.Component>
  )
  return {
    id: invite.id,
    orgName: invite.orgName,
    email: invite.email,
    accept: invite.accept.to ? (
      <ScreenLink asChild to={invite.accept.to}>
        {button}
      </ScreenLink>
    ) : (
      button
    ),
  }
}

/**
 * The invitations that wait for the person signed in, registered with
 * Mokly. The rows are data, and the adapter draws Accept invitation.
 */
export const pendingInviteList = defineComponent({
  slug: 'pending-invite-list',
  title: 'Pending invite list',
  description:
    'The org invitations that wait for the person signed in: each org with the email that it invited, and Accept invitation, which joins the org and opens it. The mark of an open invite stands in place of the org initials. A stacked list puts each Accept invitation under its text, at full width, as a phone needs. The app shares it. Its own page shows two invitations to Cal.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['invites', 'stacked'],
    properties: {
      invites: { type: 'array', items: inviteRowSchema },
      /** Each Accept invitation goes under its text, for a phone. */
      stacked: { type: 'boolean' },
    },
  } as const,
  props: { invites: inviteRows(pendingInvites), stacked: false },
  render: (props) => (
    <PendingInviteList
      invites={props.invites.map(rowOf)}
      stacked={props.stacked}
    />
  ),
  variants: [
    {
      slug: 'stacked',
      title: 'Stacked',
      description:
        'The list of a phone: each Accept invitation under its text.',
      props: { stacked: true },
    },
    {
      slug: 'primary',
      title: 'Main action',
      description:
        'One invitation whose Accept invitation is the main action of the screen, as the waitlist shows it.',
      props: { invites: inviteRows(waitingInvites, 'primary') },
    },
  ],
})

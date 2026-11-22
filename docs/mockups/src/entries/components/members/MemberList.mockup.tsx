import { defineComponent } from '@mokly/mokly'
import { MemberList } from '../../../components/members/MemberList'
import {
  acmeInvites,
  acmeMembers,
  memberViewer,
  you,
} from '../../../fixtures/members'
import { workspaceList } from '../../../fixtures/workspaces'
import { memberListProperties, memberListRequired } from './memberSchemas'

/** The members of an org with their roles, registered with Mokly. */
export const memberList = defineComponent({
  slug: 'member-list',
  title: 'Member list',
  description:
    'The members of an org with their roles and the count of the workspaces that each one owns, then the open invites. An admin changes the role of a member, removes a member, and cancels an invite. Nobody removes themselves here. Its own page shows the members of Acme as Cal, an admin, sees them.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: memberListRequired,
    properties: memberListProperties,
  } as const,
  props: {
    members: acmeMembers,
    invites: acmeInvites,
    workspaces: workspaceList,
    viewer: you,
    canManage: true,
  },
  render: (props) => (
    <MemberList
      canManage={props.canManage}
      invites={props.invites}
      members={props.members}
      viewer={props.viewer}
      workspaces={props.workspaces}
    />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The members and their roles as Priya, who is not an admin, sees them: no actions and no invites.',
      props: { invites: [], viewer: memberViewer, canManage: false },
    },
  ],
})

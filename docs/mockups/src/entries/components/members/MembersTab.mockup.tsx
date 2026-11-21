import { defineComponent } from '@mokly/mokly'
import { MembersTab } from '../../../components/members/MembersTab'
import {
  acmeInvites,
  acmeMembers,
  memberViewer,
  you,
} from '../../../fixtures/members'
import { workspaceList } from '../../../fixtures/workspaces'
import { memberListProperties, memberListRequired } from './memberSchemas'

/** The Members tab of the org settings, registered with Mokly. */
export const membersTab = defineComponent({
  slug: 'members-tab',
  title: 'Members tab',
  description:
    'The Members tab of the org settings: an invite by email for an admin, then each member with their role. Admins manage the members and who owns each workspace. A member who is not an admin sees the members and their roles, without the invite and without actions. Its own page shows the tab of Acme for an admin.',
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
    <MembersTab
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
        'The tab of Priya, who is not an admin: the members and their roles, without the invite and without actions.',
      props: { viewer: memberViewer, canManage: false },
    },
  ],
})

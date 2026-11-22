import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const ownComputer = defineScreen({
  title: 'Own computer',
  description:
    'The page of build-01, which its row opens, as Cal, an admin, sees it. The header names build-01, with Own computers as the way back, and the tabs keep Own computers. The Computer box gives its state, Connected, its workspaces, 2 of 4 running of 6, its size, its system, and the day when Cal added it. The build card of the Cloud computer tab follows, with the builds of build-01: its last build, Build computer, and the history. Workspaces at once holds the limit, with the default for the size of build-01 in its hint, and Save is on only after a change. Remove computer comes last.',
  rationale:
    'An admin sets the number of workspaces that run at once on each own computer, and the default gives each workspace 4 vCPU and 8 GB, the size of a cloud computer, as the design calls of the plan say. Each own computer builds its own image of the org, as a cloud account does, so its page reuses the build card of the Cloud computer tab: its log, its saved message, and Try again. Remove computer asks first, because the computer cannot connect again.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'own-computers', computer: 'build-01' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'full',
      title: 'Full',
      description:
        'The page of build-02, which runs 4 of 4 workspaces. Its state says Full. New workspace still offers it, with a notice.',
      rationale:
        'Full is a state of a connected computer, so the page shows it beside the limit that Cal can raise.',
      props: { computer: 'build-02' },
    },
    {
      slug: 'offline',
      title: 'Offline',
      description:
        'The page of lab-server, which is offline. A notice at the top says that its workspaces start when it connects again, and asks to check that the server is on and reaches the internet. The state gives the time when the app last saw it.',
      rationale:
        'A start on an offline own computer waits for it until the 20-minute limit of a start, so the notice says where the problem is: on the server, which only an admin of it can fix.',
      props: { computer: 'lab-server' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The page of build-01 as Priya, a member who is not an admin, sees it: the facts and the builds without Build computer, and no limit field and no Remove computer.',
      rationale:
        'Own computer decision 2 A: only admins set the limit and remove a computer.',
      props: { computer: 'build-01', viewer: 'member' },
    },
    {
      slug: 'remove',
      title: 'Remove computer',
      description:
        'The question before Remove computer. Each workspace of Acme on build-01 stops, and build-01 can no longer connect. Its 6 workspaces keep their chats, but they cannot start again. Their files stay on the server, so Cal deletes them there. A phone shows the question in a sheet.',
      rationale:
        'The design calls of the plan say that a removal revokes the token of the computer, that its workspaces keep their chat, and that the app does not delete their files on the server. The app stops the running workspaces first, so none keeps running where the app cannot reach it.',
      props: { computer: 'build-01', dialog: 'remove-computer' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

const flow = ['user-flows/add-own-computer']

export const addComputer = defineScreen({
  title: 'Add computer',
  description:
    'Cal pressed Add computer. A dialog asks for the name of the new computer, here build-03, with the hint that members see it when they choose where a workspace runs. One sentence says that people with root access to the server can read the work, the env vars, and the allowed secrets of each workspace on it. Continue shows the install command. A phone shows the same steps in a sheet.',
  rationale:
    'Own computer decision 2 A gives only admins this action, because a server serves the whole org. The sentence about root access says what an admin trusts the server with, which own computer decision 2 names as its reason. The name is the only field: the size of the server comes from the server at its first connection, and the limit follows from that size.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: {
    ...acmeSettings,
    tab: 'own-computers',
    ownComputers: 'before-add',
    dialog: 'add-computer',
  },
  useCasePaths: flow,
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'command',
      title: 'Install command',
      description:
        'The one-line install command of build-03 with its one-time code, in the mono type, with Copy. Cal runs it on the server as a user who can use sudo. The line under it says that the code works once, within 1 hour, and that the server needs Linux on x86_64, with systemd and Podman. A spinner waits for build-03 to connect. Close keeps the code, and the row of build-03 waits in the list.',
      rationale:
        'The command installs the program conductive in computer mode, which opens one outbound connection to the app, so the server needs no open port. It runs rootless Podman as a systemd user service of a dedicated user, so it needs sudo once. An own computer is Linux on x86_64 only, because that is the one release target today.',
      props: { ownComputers: 'waiting', dialog: 'computer-command' },
      useCasePaths: flow,
    },
    {
      slug: 'connected',
      title: 'Connected',
      description:
        'build-03 connected. The dialog says that it builds the setup of Acme now, and that workspaces can start on it when the build succeeds. It runs up to 4 workspaces at once, for its 16 vCPU and 64 GB, and Cal can change that on its page. Done shows the list, where build-03 builds.',
      rationale:
        'The default limit gives each workspace 4 vCPU and 8 GB, the size of a cloud computer, so the server reports its size at its first connection. Each own computer builds its own image of the org before its first workspace.',
      props: { ownComputers: 'list', dialog: 'computer-connected' },
      useCasePaths: flow,
    },
    {
      slug: 'expired',
      title: 'Code expired',
      description:
        'build-03 did not connect within 1 hour, while the dialog stayed open. The dialog says so: New code shows the install command with a new code, and Remove build-03 takes the computer out of the list.',
      rationale:
        'A computer that never connected holds no workspace, so its removal asks no more question.',
      props: { ownComputers: 'expired', dialog: 'computer-expired' },
      useCasePaths: [],
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const portPreview = defineScreen({
  title: 'Port preview',
  description:
    'Port 3000 of the sandbox in its Preview tab of the centre row, after the sessions and the files. Port 6006 has its own Preview tab beside it. Each tab shows the globe icon and the label of its port. A bar over the page holds Reload, which loads the page again, and Open, which shows the same preview in a new tab, where the previewed app can keep its cookies. The spoken name of Open is "Open in new tab". Only a Preview tab has this bar. The Preview tool in the tools panel has no bar on desktop. It lists each port, also the ports that have a tab, and the row of port 3000 is the current one. A click on a port shows its tab, or opens a new one. Nothing in the tool ends a preview: a preview stays open until the cloud computer stops, and the app opens a new one when its tab shows again, with no notice. A phone has no Preview tab in its row, so its Preview page keeps the page in a frame, with the tabs of the open previews, "+", Reload, and Open. Each tab there shows the port and the name of its server, cut to 10 characters, such as "storybook…". The tooltip and the spoken name of a tab give the port, the full name, and the folder. The Preview tabs behind a session, and after a Close, are at app/tools/preview-tab.',
  rationale:
    'The user chose on 13 November 2026 to show the page in a centre tab, because the frame in the panel was too small to use. On 16 November 2026 the user chose a tab for each port, which a click on the port loads or focuses (decision 291). Decision 290: the tool always shows its normal view, the list of ports, so a click on each port opens many previews, and the desktop needs no "+". On 13 November 2026 the user asked to remove the bar of the tool on desktop, and to move Reload and Open to a bar of the Preview tab. Decisions 292 to 294, on 16 November 2026: a preview ends by itself when the cloud computer stops, its use never keeps the computer running, and nothing shows the time left. The user chose detected servers on 10 November 2026, with decisions 220 C and 221 D, and asked for a short tab label that is cut with "…". The user asked on 10 November 2026 for the short label "Open" on the link to a new tab.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'preview',
    ports: 'open',
    tab: 'preview',
    focus: 'tool',
  },
  useCasePaths: [
    'user-flows/open-a-local-server',
    'user-flows/open-a-terminal-link',
  ],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'detected',
      title: 'Detected servers',
      description:
        'No preview is open. The port form lists the servers that the runner detects, in the order of their ports. Each row is a button with the port, the program name, and the folder. A folder that does not fit keeps its end, after "…". A click opens the preview of the port in a new Preview tab of the centre row on desktop, and on the Preview page of a phone. The smaller Other port row opens any other port. The list after a failed repair is at app/tools/preview-repair.',
      rationale:
        'The list fills the panel from its top and scrolls, as the file lists do, because the panel is short and a report can hold 64 servers. The two astro dev rows show how the folder tells two servers of one program apart.',
      props: { ports: 'detected', tab: 'session' },
    },
    {
      slug: 'no-servers',
      title: 'No server yet',
      description:
        'The runner reports no server. The form says where servers show, and asks the user to start one in the terminal or to ask the agent. The port field stays.',
      props: { ports: 'no-servers', tab: 'session' },
    },
    {
      slug: 'no-report',
      title: 'No report',
      description:
        'The app has no report of the servers, as for a sandbox from an older image. The form reads as before, and the user types a port.',
      rationale:
        'Only an org image build installs a new runner, so a workspace from an older image never reports its servers.',
      movedFrom: 'app/tools/preview-empty',
      props: { ports: 'no-report', tab: 'session' },
    },
    {
      slug: 'another-port',
      title: 'Another port',
      description:
        'On a phone, after "+", the tabs of the open previews stay, and no tab is current. The port form lists the servers that have no preview yet, so ports 3000 and 6006 leave the list. The desktop tool always lists each port, so it has no "+", and it shows the same screen as the open preview.',
      props: { ports: 'adding' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const portPreview = defineScreen({
  title: 'Port preview',
  description:
    'Port 3000 of the sandbox in the Preview tab of the centre row, beside the sessions and the files. The tab shows the globe icon and the label of its preview. A bar over the page holds Reload, which loads the page again, and Open, which shows the same preview in a new tab, where the previewed app can keep its cookies. The spoken name of Open is "Open in new tab". Only the Preview tab has this bar. The Preview tool in the tools panel has no bar on desktop: it shows the servers that have no preview yet, and a click on one loads its preview into the Preview tab. A phone has no Preview tab in its row, so its Preview page keeps the page in a frame, with the tabs of the open previews, "+", Reload, and Open. Each tab there shows the port and the name of its server, cut to 10 characters, such as "storybook…". The tooltip and the spoken name of a tab give the port, the full name, and the folder. The Preview tab behind a session, and after its Close, is at app/tools/preview-tab.',
  rationale:
    'The user chose on 13 November 2026 to show the page in a centre tab, because the frame in the panel was too small to use. Decision 288 A: one shared Preview tab, whose page follows the preview that the user picks in the tool. Decision 290: the tool always shows its normal view, the list of servers, so a click on each port opens many previews, and the desktop needs no "+". On 13 November 2026 the user also asked to remove the bar of the tool on desktop, and to move Reload and Open to a bar of the Preview tab. The user chose detected servers on 10 November 2026, with decisions 220 C and 221 D, and asked for a short tab label that is cut with "…". The list of the port form shows the folder, so the tab does not. A port that the latest list does not name keeps the label "Port 3000". The user asked on 10 November 2026 for the short label "Open" on the link to a new tab.',
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
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'detected',
      title: 'Detected servers',
      description:
        'No preview is open. The port form lists the servers that the runner detects, in the order of their ports. Each row is a button with the port, the program name, and the folder. A folder that does not fit keeps its end, after "…". A click opens the preview of the port in the Preview tab of the centre row on desktop, and on the Preview page of a phone. The smaller Other port row opens any other port. The list after a failed repair is at app/tools/preview-repair.',
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
        'On a phone, after "+", the tabs of the open previews stay, and no tab is current. The port form lists the servers that have no preview yet, so ports 3000 and 6006 leave the list. The desktop tool always shows that list, so it has no "+", and it shows the same screen as the open preview.',
      props: { ports: 'adding' },
    },
  ],
})

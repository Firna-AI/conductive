import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const previewExpanded = defineScreen({
  title: 'Expanded preview',
  description:
    'A press on Expand in the bar of the Preview tab of port 3000 showed its page in a large window over the whole app, the rail and the sidebar too, on the dim layer of a dialog. The header of the window names the page with the label of its tab, and holds Reload, Open, and Close. Close, Escape, and a press on the dim layer close the window, and the focus goes back to Expand. The page stays in its tab, as the member left it in the window: the app does not load it again, so its scroll, its address, and its sign-in stay. While the window shows, the keys of the app do nothing, and Tab moves only between the header and the page. Escape works while the focus is in the header. A key in the page goes to the page. A phone shows the page from edge to edge already, so it has no Expand, and its Preview page shows here.',
  rationale:
    'Cal asked on 20 November 2026 for an Expand button that shows the preview in a large window over the whole app, with a Close, so a page is easy to view in a larger size. A design call of 20 November 2026 keeps the page in its own frame and shows that frame in the window, because a new frame loads the page again, at the root address of the preview, and loses its state. This page stands beside app/tools/preview, which already shows five screens.',
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
    overlay: 'expanded-page',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'html',
      title: 'HTML file',
      description:
        'A press on Expand in the header of report.html, in Preview, showed the page of the file in the same large window. The header of the window names the file, and holds Reload, Open, and Close, as for a Preview tab. Close shows the tab of the file again, with its page as the member left it. On a phone the file shows as a page of the Files tab, with no Expand.',
      rationale:
        'The tab of an HTML file has the actions of the bar of a Preview tab, so it has Expand too.',
      props: {
        banner: 'checks-failed',
        files: 'all',
        focus: 'files',
        tab: 'html',
        temporary: 'opened',
        tool: 'terminal',
      },
    },
  ],
})

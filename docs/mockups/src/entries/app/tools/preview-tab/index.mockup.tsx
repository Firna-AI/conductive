import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const previewTab = defineScreen({
  title: 'Preview tab',
  description:
    'The first session shows, and the Preview tab of port 3000 stays in the centre row after the code file. Its page stays loaded, so a click on the tab shows it again with no new load. The Preview tool keeps the tab of port 3000 as the current one, with Reload and Open, because the Preview tab holds that preview. Reload loads the page in the Preview tab again, also while a session shows. A phone has no Preview tab in its row, so its Preview page keeps the page in a frame. The Preview tab in its place is at app/tools/preview.',
  rationale:
    'The user chose one shared Preview tab on 13 November 2026, with decision 288 A. The page stays loaded behind another tab, as the page of the Preview tool stays while the Terminal shows. This page stands beside app/tools/preview, which already shows five screens.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'preview',
    ports: 'open',
    tab: 'preview-behind',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'closed',
      title: 'After Close of the tab',
      description:
        'The user closed the Preview tab, and the first session shows. Close removes only the tab: the previews of ports 3000 and 6006 stay open in the Preview tool. No tab of the tool is current, and Reload and Open do not show, because no Preview tab holds a preview. A click on a tab of the tool, or on a server, opens the Preview tab again at the end of the row.',
      rationale:
        'The user chose on 13 November 2026, with decision 289 A, that Close of the Preview tab ends no preview. The tab is a view of the preview, so a server preview that the user may want again stays open. The Close of a tab of the tool still ends its preview.',
      props: { tab: 'session' },
    },
  ],
})

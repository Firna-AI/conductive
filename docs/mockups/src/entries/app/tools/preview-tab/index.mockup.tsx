import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const previewTab = defineScreen({
  title: 'Preview tabs',
  description:
    'The first session shows, and the Preview tabs of ports 3000 and 6006 stay in the centre row after the code file. Their pages stay loaded, so a click on a tab shows it again with no new load, with Reload and Open in its bar. No row of the Preview tool is current, because no Preview tab shows. A phone has no Preview tab in its row, so its Preview page keeps the page in a frame. A shown Preview tab is at app/tools/preview.',
  rationale:
    'The user chose a Preview tab for each port on 16 November 2026, with decision 291. A page stays loaded behind another tab, as the page of the Preview tool stays while the Terminal shows. This page stands beside app/tools/preview, which already shows five screens.',
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
        'The user closed both Preview tabs, and the first session shows. Close removes only a tab, and the previews end by themselves later. A click on a port in the Preview tool opens its Preview tab again at the end of the row. When its preview has ended, the app opens a new one, with no notice.',
      rationale:
        'The user chose on 13 November 2026, with decision 289 A, that Close of a Preview tab ends no preview. On 16 November 2026, with decision 292, the user chose that a preview ends by itself after a time without use, and that nothing shows the time left.',
      props: { tab: 'session' },
    },
  ],
})

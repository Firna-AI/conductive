import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesHtml = defineScreen({
  title: 'HTML preview',
  description:
    'A press on report.html in the context folder of All files opened it in the temporary tab, at the end of the row, in Preview. An agent wrote the report as a web page. The page shows in a frame under the header, as a browser draws it, with its own styles and the bars that its script draws. The header has Download beside the path, then Reload, Open, Copy, and the switch between Preview and Source. Reload loads the page again. Open shows the page in a new browser tab, and its spoken name is "Open in new tab". The row of report.html is marked in the open context folder. Git ignores that folder, so the row has no mark of a change. On a phone the file shows as a page of the Files tab, with the page in the frame. Reload and Open take a second line of its header, right above the page, so the first line keeps the path and the actions on the file.',
  rationale:
    'Cal chose option A of HTML preview decision 1 on 18 November 2026: the tab of an HTML file gets the switch of a Markdown tab, and Preview shows the page in a frame from the preview domain, as a port preview does. So the scripts of the page run on the preview domain, never on the site of the app. The tab starts in Preview, as a Markdown tab does, because Cal asked to see the page from the file list. Reload and Open come from the bar of a Preview tab. Cal chose option A of HTML preview decision 3 on the same day, so the frame and Open load the page at the path of its file, and its relative addresses work. With option D of HTML preview decision 2, of the same day, the page can load each file of the repository folder outside .git, except the dot files, such as .env.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'html',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'source',
      title: 'Source',
      description:
        'The switch shows Source. The text of report.html shows with line numbers and the syntax colours of HTML, as a code file shows: comments, quoted values, and numbers have their own colours. The header gives the line count in place of Reload and Open, because no page shows.',
      rationale:
        'The switch keeps the view of the tab, as for a Markdown file. A file chip with lines opens Source, as it opens every file at its lines.',
      props: { tab: 'html-source' },
    },
    {
      slug: 'opening',
      title: 'Opening the preview',
      description:
        'From the press until the page loads, the tab shows one wait: first while the app opens the preview of the files, then while the frame loads the page. The frame shows the page that shows while a preview opens, as app/tools/preview-opening draws it: the logo tile, a turning ring, and "Opening preview". Reload and Open show in the header, because a page opens. The page of the file takes its place when it loads.',
      rationale:
        'A design call of 18 November 2026 gives the tab the look of the launch page for the whole wait, so the member sees one wait. Each load of the frame starts at the launch address of the preview, as for a port preview, and that page shows while the browser gets its grant. The page fades in after a short wait, so a fast open shows no flash.',
      props: { tab: 'html-opening' },
    },
    {
      slug: 'older-software',
      title: 'Older cloud computer software',
      description:
        'The cloud computer has older software, which cannot show the page. In place of the page, a notice says that the preview needs newer cloud computer software, and asks the member to select Restart in the workspace header. The notice has no button of its own. The header has no Reload and no Open, because no page loads. Source still shows the text of the file.',
      rationale:
        'Restart in the workspace header downloads the newest software and restarts the agents, as app/restart shows. The workspace shows Starting until the agents are back. When it leaves Starting, the tab opens the preview again by itself, and the page shows. The agent runner also installs a newer release by itself while the workspace is idle. The page then shows at the next show of the tab. A design call of 18 November 2026 chose this, with no new event. The words follow the public guide, which asks to select Restart in the workspace header when Preview asks for newer software.',
      props: { tab: 'html-older-software' },
    },
    {
      slug: 'failed',
      title: "The preview couldn't open",
      description:
        'The app could not open the preview of the page, because the cloud computer did not answer. In place of the page, the tab shows the failure of a Preview tab: "The preview couldn\'t open", the message of the server, and Try again, which opens the preview again. The header has no Reload and no Open, because no page loads. Source still shows the text of the file.',
      rationale:
        'A design call of 18 November 2026 shows a failed open as a Preview tab shows it, so both tabs show a failure the same way. The reply of older software keeps its own notice, because only newer software fixes it. The message is the reply that the Worker sends when the cloud computer does not answer a request of a preview.',
      props: { tab: 'html-failed' },
    },
  ],
})

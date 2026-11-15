import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const attachmentsOpen = defineScreen({
  title: 'Open a sent screenshot',
  description:
    'Cal pressed the chip of the screenshot in the sent message. Its copy in the cloud computer opens in the temporary tab, whose title shows in italics. The tab shows the picture of the screenshot. The picture keeps its proportions and fits the width and the height of the tab. The header gives the path of the copy, with Download, and Copy is off. All files does not list the copy. On a phone, the copy opens as a page of Files.',
  rationale:
    'The user chose option B of decision 264 on 10 November 2026: a press on a sent chip opens the file tab of its copy, as a press on a file chip opens its file. The user chose option B of decision 265: the file tab shows a PNG, JPEG, GIF, or WebP file up to its read limit as a picture, for every image of the workspace. Git ignores the context folder, so All files does not list the copy, and a read names the copy by its file name. A copy that an agent deleted shows "This file moved or was deleted", as app/chat/masked-paths/unnamed shows for each file. The user chose option B of decision 284 on 11 November 2026: a press opens a file in the temporary tab. A design call of 12 November 2026 applies it to the chip of an attached file too, because decision 264 B opens that chip as a file chip opens its file.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'sent-files',
    composer: 'empty',
    tab: 'attachment',
    temporary: 'opened',
    focus: 'files',
  },
  useCasePaths: ['user-flows/drop-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

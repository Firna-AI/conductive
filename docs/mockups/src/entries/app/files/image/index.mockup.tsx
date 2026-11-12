import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesImage = defineScreen({
  title: 'Image',
  description:
    'checkout-mobile.png opened from All files: a tab with its picture. The picture keeps its proportions and fits the width and the height of the tab. A smaller picture keeps its own size. The header keeps Download, and Copy is off, as for every file that is not text. Its row in the list is marked.',
  rationale:
    'The user chose option B of decision 265 on 10 November 2026: the file tab shows a PNG, JPEG, GIF, or WebP file up to its read limit as a picture, for every image of the workspace. The tab knows an image by the name of the file, because the reads of the cloud computer give no image type for each image. An image over the read limit keeps the state of the limit, "Open this file in the terminal". An SVG file stays text with line numbers, because its source is what a member edits.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'image',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'cannot-draw',
      title: 'Image that does not draw',
      description:
        'social-card.png has the name of a picture, but the browser cannot draw its bytes. The tab shows "Download this file to open it", as for each binary file, with Download.',
      rationale:
        'A damaged file or a file with a wrong name still opens: its download gives the member the bytes, as for every other binary file.',
      props: { tab: 'image-not-drawn' },
    },
  ],
})

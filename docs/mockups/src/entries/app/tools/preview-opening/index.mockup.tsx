import { defineScreen } from '@mokly/mokly'
import {
  PreviewOpeningScreen,
  previewOpeningSchema,
} from '../../../../screens/PreviewOpeningScreen'

export const previewOpening = defineScreen({
  title: 'Opening a preview',
  description:
    'The page that shows while a preview opens: in the frame of the Preview tool, in a new tab from Open, and in the default browser from the Mac app. The logo tile sits above a turning ring and "Opening preview", on the background of the app, in the colour scheme of the system. The page fades in after a short wait, so a fast open shows no flash. With reduced motion, the ring fades in and out and does not turn.',
  rationale:
    'The user asked on 13 November 2026 for a page in the design of the app, with a proper loader, that stays light. The server sends it as one small file with inline styles and drawings, and it loads no font, image, or script file. The app frame and the browser tab show the same page, so the open looks the same everywhere.',
  relatedDocs: [],
  address: 'authorize.conductive.page',
  propSchema: previewOpeningSchema,
  props: { state: 'opening' },
  render: (props) => <PreviewOpeningScreen state={props} />,
  variants: [
    {
      slug: 'failed',
      title: 'Preview not available',
      description:
        'The preview did not open in the browser: its link was already used or is too old, the preview closed, or the cloud computer stopped. The ring goes, and the page asks the user to open the preview again from the workspace.',
      rationale:
        'Each link of a browser launch works once and for 60 seconds, so a reload or an old tab gets this page. A new open from the workspace gives a new link.',
      props: { state: 'failed' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import {
  InAppBrowserScreen,
  inAppBrowserSchema,
} from '../../../../screens/InAppBrowserScreen'

export const phoneBrowserOpening = defineScreen({
  title: 'Opening a preview',
  description:
    'Just after a press on a port, the in-app browser shows the page of the authorizer while the preview opens: its host in the bar, then the logo tile above a turning ring and "Opening preview", as app/tools/preview-opening draws the page. The page then goes to the host of the preview, as phone-app/browser shows.',
  rationale:
    'The phone app asks the server for a browser launch, as the Mac app does, and opens its authorizer address in the in-app browser. The grant goes only in the fragment of that address, and the page of the authorizer removes it before it posts the grant. So the page of the authorizer shows first, with its own host.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: inAppBrowserSchema,
  props: { page: 'opening' },
  useCasePaths: ['user-flows/open-a-preview-on-a-phone'],
  render: (props, context) => (
    <InAppBrowserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Preview not available',
      description:
        'The preview did not open: its grant was older than 60 seconds or already used, the preview closed, or the cloud computer stopped. The ring goes, and the page asks the person to open the preview again from the workspace. Done shows the Preview tool, where a new press gives a new grant.',
      rationale:
        'Each grant works once and for 60 seconds, so a reload of this page, or a page that the system kept from an earlier open, gets this page. The page of the authorizer is the same as in a browser, so the words stay the same.',
      props: { page: 'failed' },
    },
  ],
})

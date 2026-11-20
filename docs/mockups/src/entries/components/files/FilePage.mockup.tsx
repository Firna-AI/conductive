import { defineComponent } from '@mokly/mokly'
import { FilePage } from '../../../components/files/FilePage'
import { paths } from '../../../paths'
import { inPlace, placeHeightSchema } from '../common/ownPages'
import { fileTabViews } from './fileSchemas'

/**
 * A file as a full page, registered with Mokly: a tab of the centre column
 * on desktop, and a page of the Files tab on a phone. A screen supplies
 * the state of a sandbox that takes the place of the content. The page
 * fills the height of its tab, so its own pages give it a place of a fixed
 * height.
 */
export const filePage = defineComponent({
  slug: 'file-page',
  title: 'File page',
  description:
    'A file, a code preview, a picture, or a diff as a full page. The header shows the label of the path and the actions on the file: Download, Copy, and, for Markdown and HTML, the switch between the preview and the source. The page of an HTML file in a frame adds Reload, Expand on desktop, and Open. A diff shows its lines in the header. A picture keeps Download, and its Copy is off. On a phone the page leads back to its list. A screen can supply the state of a sandbox in place of the content. Its own page shows a code file.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['view'],
    properties: {
      view: { enum: fileTabViews },
      /** The way back to the list of the file, on a phone. */
      back: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'to'],
        properties: {
          label: { type: 'string' },
          to: { type: 'string', minLength: 1 },
        },
      },
      /** The screen of an HTML page in its large window, which Expand shows. */
      expandTo: { type: 'string', minLength: 1 },
      placeHeight: placeHeightSchema,
    },
  } as const,
  slots: ['placeholder'],
  props: { view: 'code', placeHeight: 560 },
  render: (props) =>
    inPlace(
      <FilePage
        back={props.back}
        expandTo={props.expandTo}
        placeholder={props.placeholder}
        view={props.view}
      />,
      props.placeHeight,
    ),
  variants: [
    {
      slug: 'markdown',
      title: 'Markdown',
      description:
        'The preview of README.md, with the switch to its source in the header.',
      props: { view: 'markdown' },
    },
    {
      slug: 'diff',
      title: 'Diff',
      description: 'The diff of AddressForm.tsx, with its lines in the header.',
      props: { view: 'diff' },
    },
    {
      slug: 'picture',
      title: 'Picture on a phone',
      description:
        'A picture of the branch as a page of the Files tab, which leads back to All files. Copy is off, because the file is not text.',
      props: {
        view: 'image',
        back: { label: 'All files', to: paths.filesAll },
      },
    },
    {
      slug: 'missing',
      title: 'File missing',
      description:
        'A file whose name the app does not know, which moved or was deleted. The header shows "File" without Download.',
      props: { view: 'unnamed' },
    },
  ],
})

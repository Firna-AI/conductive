import { defineComponent } from '@mokly/mokly'
import {
  AttachedName,
  KindIcon,
} from '../../../../../../src/ui/components/chat/attachedFileParts'

/**
 * The icon of the kind of an attached file, registered with Mokly. The app
 * draws the same icon, so mockup-only parts render the wrapper.
 */
export const kindIcon = defineComponent({
  slug: 'kind-icon',
  title: 'Kind icon',
  description:
    'The icon of the kind of an attached file: a picture for an image, which also goes to the model as an image, or a page for another file. Its own page shows the icon of an image.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'size'],
    properties: {
      kind: { enum: ['image', 'file'] },
      size: { type: 'number', minimum: 1 },
      /** A class of the call, such as the colour of a list. */
      className: { type: 'string' },
    },
  } as const,
  props: { kind: 'image', size: 13 },
  render: (props) => (
    <KindIcon className={props.className} kind={props.kind} size={props.size} />
  ),
  variants: [
    {
      slug: 'file',
      title: 'File',
      description: 'The icon of a file that is not an image.',
      props: { kind: 'file' },
    },
  ],
})

/**
 * The name of an attached file in its chip, registered with Mokly. The app
 * draws the same name, so mockup-only parts render the wrapper.
 */
export const attachedName = defineComponent({
  slug: 'attached-name',
  title: 'Attached name',
  description:
    'The name of an attached file in its chip. The end of a long name gives way first. Screen readers hear "Attached file" before it.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: { name: { type: 'string' } },
  } as const,
  props: { name: 'postcode-overlap.png' },
  render: (props) => <AttachedName name={props.name} />,
})

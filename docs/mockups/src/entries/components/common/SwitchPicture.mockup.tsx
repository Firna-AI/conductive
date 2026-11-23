import { defineComponent } from '@mokly/mokly'
import { SwitchPicture } from '../../../../../../src/ui/components/common/SwitchPicture'

/**
 * The picture of a switch at the end of a menu row, registered with Mokly.
 * The row owns the switch role, so the picture is neither a control nor
 * read aloud.
 */
export const switchPicture = defineComponent({
  slug: 'switch-picture',
  title: 'Switch picture',
  description:
    'A switch drawn as decoration, in the look of the switch of `@firna/ui`, such as at the end of Fast in the model menu. The row around it owns the `menuitemcheckbox` role. Its own page shows the switch on.',
  relatedDocs: ['docs/mockups/README.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['on'],
    properties: { on: { type: 'boolean' } },
  } as const,
  props: { on: true },
  render: (props) => <SwitchPicture on={props.on} />,
  variants: [
    {
      slug: 'off',
      title: 'Off',
      description: 'The switch of a setting that is off.',
      props: { on: false },
    },
  ],
})

import { defineComponent } from '@mokly/mokly'
import { CheckOption } from '../../../components/common/CheckOption'

/**
 * A checkbox with its label and a muted hint, registered with Mokly. The
 * screens show it checked, with a hint, so its own page shows that state.
 */
export const checkOption = defineComponent({
  slug: 'check-option',
  title: 'Check option',
  description:
    'A checkbox with its label and a muted hint, for an option of a form or a question, such as an extra step of an action. The whole row takes the click, and on a phone it is 40 px high. Its own page shows a checked option with a hint.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'checked'],
    properties: {
      label: { type: 'string' },
      hint: { type: 'string' },
      checked: { type: 'boolean' },
    },
  } as const,
  props: {
    label: 'Also disable their referral code',
    hint: 'CND-7Q2K then lets nobody in, also after a lift. Disable is final.',
    checked: true,
  },
  render: (props) => (
    <CheckOption
      checked={props.checked}
      hint={props.hint}
      label={props.label}
    />
  ),
})

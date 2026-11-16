import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const macExtend = defineScreen({
  title: 'Extend the 15 minutes',
  description:
    'The user pressed Extend in the bar of the 15 minutes. The Mac set their end to 15 minutes from its own time now and saved it, so the bar shows 15:00 left. A done Extend shows no result, because the time left shows the change. Extend sits between the time left and Stop whenever the bar shows the time left.',
  rationale:
    'The user chose an Extend button beside Stop, which goes to the Mac as a settings change, like Stop (12 November 2026). Extend sets the end to 15 minutes from now and does not add 15 minutes to the time left, so the 15 minutes of decision 62 keep their length. The Mac extends only 15 minutes that run, and an Extend never starts them.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'allow-all',
    change: 'extended',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'failed',
      title: 'Not extended',
      description:
        'The Mac could not extend the 15 minutes, so they keep their old end. The bar names the cause that the Mac gave, and keeps the time left, Extend, and Stop, so the user can extend again or stop. An Extend that reaches the Mac after the 15 minutes ended fails too, but its result does not show, because the bar goes with the 15 minutes.',
      rationale:
        'An Extend is done or failed, never done but not saved: the Mac saves the new end first, and a failed save leaves the 15 minutes as they were (12 November 2026). The result has no Try again, because Extend stays in the bar.',
      props: { change: 'extend-failed' },
    },
  ],
})

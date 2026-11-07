import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const macRequests = defineScreen({
  title: 'Many requests',
  description:
    'An agent asked to run four commands on this Mac, and the first is a long script. The requests wait in a region just above the composer, which takes at most 40% of the window. The region scrolls, and its edge fades where it cuts a request, so the transcript and the composer stay in view. The arrow beside Allow opens its menu in the top layer, so the region never cuts it.',
  rationale:
    'A long command or many requests must never push the composer out of view, and the menu of Allow must never be cut (7 November 2026). Each request keeps its own Deny and Allow, as decision 62 says, and the keyboard scrolls the region from any of its controls.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'many',
    change: 'none',
  },
  render: (props) => <MacAppScreen state={props} />,
})

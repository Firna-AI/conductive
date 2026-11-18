import { defineScreen } from '@mokly/mokly'
import {
  OperatorScreen,
  operatorSchema,
} from '../../../../screens/OperatorScreen'

export const operatorLongRuns = defineScreen({
  title: 'Long runs',
  description:
    'The Overview at a quiet moment, when 3 workspaces run, so Long runs lists all of them, longest first. The newest started 41 seconds ago, and its cloud computer does not exist yet. Its row shows a dash in place of the cloud computer ID, without Copy, and its run length gives seconds. The counts of the page match the list: 3 running workspaces, and 2 builds.',
  rationale:
    'The list has no minimum time, so a short run shows when fewer than 10 run. A cloud computer gets its ID only when it exists, and the run starts before that.',
  relatedDocs: [],
  propSchema: operatorSchema,
  props: { numbers: 'ready', runs: 'few', signUps: 'open', waitlist: 'on' },
  render: (props, context) => (
    <OperatorScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'empty',
      title: 'No long runs',
      description:
        'No workspace runs, while 2 builds do, so Running now says 2. The list says which workspaces show in it.',
      rationale:
        'The list does not say that no cloud computer runs. The builds run on cloud computers too, and the list leaves them out. A workspace that runs at a deploy shows only after its next save, so an empty list can also come before those saves.',
      props: { runs: 'none' },
    },
  ],
})

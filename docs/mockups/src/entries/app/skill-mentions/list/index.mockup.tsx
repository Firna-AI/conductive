import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const skillMentionList = defineScreen({
  title: 'The list of skills',
  description:
    'Cal typed `/` with no query yet. The list shows every skill of the agent of the chosen model, in the order of their names. A skill that both agents have shows once. The list scrolls, and it shows at most 100 rows.',
  rationale:
    'A skill of the other agent does nothing in this message, so the rows follow the chosen model. When no skill matches a query, the list closes, and Enter sends the text, because text such as `see /tmp` is common.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'skill-start' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The workspace has no skills report yet. One line says Loading skills… in place of the rows, and the rows show as soon as the report arrives. Enter still sends the text.',
      rationale:
        'The line shows for each query, because no list can say yet whether a skill matches. The list shows no row, so Enter keeps its normal action.',
      props: { composer: 'skill-loading' },
    },
    {
      slug: 'unavailable',
      title: 'No skills report',
      description:
        'The cloud computer started, and its runner sent no skills report, as an older runner does. One line says that the list of skills is unavailable.',
      rationale:
        'The words name what failed, so the member knows that the skills of the repository can still exist. A member can still type `/` and the name of a skill.',
      props: { composer: 'skill-unavailable' },
    },
    {
      slug: 'none',
      title: 'No skills',
      description:
        'The skills report is empty. For `/` alone, one line says that this repository has no skills. A query after `/` closes the list, as when nothing matches.',
      rationale:
        'The line tells the member why the list is empty. With a query, the list would only hide the chat, so it closes as for any query without a match.',
      props: { composer: 'skill-none' },
    },
  ],
})

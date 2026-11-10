import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const repositoryRemovedRoutine = defineScreen({
  title: 'Turned off when its repository was removed',
  description:
    "Cal's routine Test the refund tools, after an admin removed acme/admin-dashboard from the chosen repositories of Acme. The routine turned off. A notice names the repository and tells Cal to choose another one, then turn the routine on. The Repository field still shows acme/admin-dashboard until Cal picks another one, and the Runs list keeps the runs from before.",
  rationale:
    'No run of a routine can succeed in a repository that the org no longer chooses, so the routine turns off before a run fails, and its page says why, as docs/protocol/routines.md requires. The notice names the repository while the org does not choose it, so the owner knows which one to replace. The app keeps the reason until the owner turns the routine on.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, routine: 'refund-tests', runs: 'refund-tests' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, reads the same routine. The notice names the repository and says that only Cal can choose another one.',
      props: { viewer: 'member' },
    },
    {
      slug: 'chosen-again',
      title: 'Repository chosen again',
      description:
        'The same routine after an admin chose acme/admin-dashboard again. The routine stays off. The notice says that its repository stopped being a chosen repository of Acme, and that it stays off until Cal turns it on.',
      rationale:
        'The words are in the past tense and name no repository. The page cannot tell a repository that an admin chose again from another repository that Cal saved in its place, so the same words must be true after either one. Cal turns the routine on when it should run again.',
      props: { routine: 'refund-tests-again' },
    },
    {
      slug: 'chosen-again-member',
      title: 'Repository chosen again, seen by a member',
      description:
        'Priya reads the routine after an admin chose acme/admin-dashboard again. The notice says that its repository stopped being a chosen repository of Acme, and that only Cal can turn it on again.',
      props: { routine: 'refund-tests-again', viewer: 'member' },
    },
  ],
})

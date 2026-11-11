import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../screens/routineState'

export const routine = defineScreen({
  title: 'Routine',
  description:
    "Cal's routine that reviews pull requests, as Cal sees it: the name, the Active switch, the repository, the section of the run workspaces, and By Cal. Then the triggers, PR opened and PR pushed, and the prompt with the model picker inside its box. Delete and Save sit in the header, and the Runs list fills the column at the right. The routine has only pull request triggers, so it has no Run now. A phone shows the routine in two tabs, Routine and Runs, with Save at the bottom and Delete at the end of the form.",
  rationale:
    'Each run uses the agent login and the GitHub access of the owner of the routine, so the line under the prompt names them. Only the owner changes the routine, turns it on, and uses Run now, as the user chose in decision 502 B. Run now does not show on a routine whose triggers are all pull request triggers, because such a run needs a pull request, as the user chose in decision 510 C. A run workspace is a normal workspace in the section that the routine chooses, from decision 504 A. Save stays off until something changes. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: ownerRoutine,
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})

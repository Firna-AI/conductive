import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../screens/routineState'

export const routine = defineScreen({
  title: 'Routine',
  description:
    "Cal's routine that reviews pull requests, as Cal sees it: the name, the Active switch, the repository, the section of the run workspaces, and By Cal. Then the triggers, PR opened and PR pushed, and the prompt with the model picker inside its box. Delete, Run now, and Save sit in the header, and the Runs list fills the column at the right. A phone shows Run now and Save at the bottom, Delete at the end of the form, and the runs below it.",
  rationale:
    'Each run uses the agent login and the GitHub access of the person who created the routine, so the line under the prompt names them. Only that person changes the routine, turns it on, and uses Run now, as the user chose in decision 202 B. A run workspace is a normal workspace in the section that the routine chooses, from decision 204 A. Save stays off until something changes.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: ownerRoutine,
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'new',
      title: 'New routine',
      description:
        'New routine opens an empty routine. Its name says Untitled routine, it is active, and it uses the first repository and the General section. It has no trigger yet, and the prompt asks what the routine should do. Save is the only action, and the Runs list says No runs yet.',
      rationale:
        'An empty name saves as Untitled routine, as in Conductor. A routine can have no trigger, because Run now still starts it. Run now and Delete come after the first save.',
      props: { routine: 'new', runs: 'none' },
      useCasePaths: ['user-flows/create-routine'],
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        "Priya, a member who is not an admin, reads Cal's routine: its facts, its triggers, its prompt with the model, and its runs, without fields and without actions. One line says that only Cal can change it.",
      rationale:
        'Every member sees each routine, its prompt, and its runs, as the user chose in decision 202 B. A run acts as its owner, so only the owner decides what runs on those logins.',
      props: { viewer: 'member' },
    },
    {
      slug: 'admin',
      title: 'Seen by an admin',
      description:
        "Cal, an admin, reads Priya's weekly routine, which uses a Codex model. Turn off and Delete are the only actions.",
      rationale:
        'An admin can turn a routine off and delete it, from decision 202 B, but cannot change it or turn it on, because its runs use the logins of its owner.',
      props: { routine: 'dependency-updates', runs: 'weekly' },
    },
    {
      slug: 'owner-left',
      title: 'Owner left the org',
      description:
        'Lena Park created this routine and then left Acme, so the routine turned off. A notice says why it stays off. Cal, an admin, can delete it, and its runs stay in the list.',
      rationale:
        'A routine stays, turned off, after its owner leaves. The owner never changes, and only the owner turns a routine on, so it cannot run again. Its run workspaces are normal workspaces, so they stay.',
      props: { routine: 'copy-review', runs: 'owner-left' },
    },
  ],
})

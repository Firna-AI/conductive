import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const authorFilter = defineScreen({
  title: 'Author filter',
  description:
    'The author filter of PR opened, open under its row. Cal added dependabot[bot] to an empty Author is, so the list added Members of Acme first, and the pull requests of the members still start runs. Author is not is empty. PR pushed keeps its filter closed, under its summary. A phone opens the filter in a sheet.',
  rationale:
    'The user chose option C of decision 206 on 9 November 2026. Only a pull request that a member opened, and only an event that a member caused, start a run. An account outside the org, such as a bot, starts runs only when Author is names it. An empty Author is means every member. Members of Acme stands for every member, so a bot joins the members and does not replace them. The owner removes that entry to limit runs to the named accounts. The app saves each account by its GitHub ID, because a login can change owner.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, triggers: 'author-filter' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'suggestions',
      title: 'Member suggestions',
      description:
        'Cal removed Members of Acme, so only the pull requests of dependabot[bot] start runs. The field has the focus and no text, so it offers Members of Acme first, then each member. It still takes any other GitHub login.',
      props: { triggers: 'suggestions' },
    },
    {
      slug: 'unknown-login',
      title: 'Unknown login refused',
      description:
        'Save refused the routine, because renovate-bot names no GitHub account. Its chip is marked, and the line under the list names the login and what to do. Members of Acme and dependabot[bot] stay in the list.',
      rationale:
        'The app turns each login into the ID of its GitHub account when it saves. A login that names no account has no ID, so the save is refused.',
      props: { triggers: 'unknown-login' },
    },
  ],
})

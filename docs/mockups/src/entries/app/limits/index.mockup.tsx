import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceSchema,
} from '../../../screens/NewWorkspaceScreen'

export const limits = defineScreen({
  title: 'Limits',
  description:
    'New workspace in Firna, a free org that keeps 3 workspaces, the most that Free allows. In place of the empty chat, Upgrade to Team comes first. Then the page lists the 3 workspaces, each with Archive, because archived workspaces do not count.',
  rationale:
    'The user set the free plan on 5 November 2026: one org with at most 3 workspaces that exist, and 600 minutes a month. Every person also has a limit of starts each day, from decision 23. At the free workspace and minutes limits, Upgrade to Team comes first, because the user said that a free account has to upgrade there. The free way comes second: archive a workspace, or wait for the next month. Whether archived workspaces count waits on decision 41, and Archive is drawn as its option B, a proposal. The start limits and the running limit give one way forward: wait for tomorrow, wait for the next hour, or stop a cloud computer. The body names the limit. A free org that invites a member upgrades instead, on the members tab. The hourly starts and the running limit wait on decision 34, drawn as its recommended option D. Archive checks first for work that is not pushed, as the user chose in decision 16.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { result: 'form', limit: 'workspaces' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'minutes',
      title: 'Out of minutes',
      description:
        'Firna used its 600 free minutes of November, so no cloud computer of the org starts. Upgrade to Team comes first. The line under it says that cloud computers start again on 1 December, when the minutes renew.',
      props: { limit: 'minutes' },
    },
    {
      slug: 'starts',
      title: 'Starts of the day',
      description:
        'The person used their 20 starts of today. Each new workspace, each resume, and each build is a start. They can start cloud computers again tomorrow.',
      props: { limit: 'starts' },
    },
    {
      slug: 'starts-hour',
      title: 'Starts of the hour',
      description:
        'The person used the starts of this hour, so the next start waits until 15:00. Waits on decision 34, drawn as its recommended option D.',
      props: { limit: 'starts-hour' },
    },
    {
      slug: 'running',
      title: 'Running at once',
      description:
        'In Acme, which is on Team, the member already runs 5 cloud computers, the most at once. The page lists them, each with Stop. Waits on decision 34, drawn as its recommended option D.',
      props: { limit: 'running' },
    },
  ],
})

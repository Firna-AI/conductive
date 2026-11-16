import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

const decision =
  'The user chose option C of Prompts decision 1, the first decision of the org prompts change, on 16 November 2026: an admin replaces the steps of each agent action, or resets them to the default. The app still adds the facts and the line "Don\'t reply on GitHub." after the steps.'

export const prompts = defineScreen({
  title: 'Prompts',
  description:
    'The Prompts tab of Acme, as an admin sees it. It lists the six agent actions of the pull request bar in their order: Create PR, Commit and push, Push, Fix checks, Resolve conflicts, and Address review. Each action shows its default steps in a box, with Save. Under the box, read-only, is the part that the app adds to each press: a line of three dashes, the facts of the action with sample values, and "Don\'t reply on GitHub." Commit and push and Push name no facts.',
  rationale: `${decision} So the tab shows that part under each box, from the same words as a press. The default steps keep the words of the earlier fixed prompts with their \`gh\` fallback, and say "below" where a fact moved after the steps. A design call of 16 November 2026 starts each long default with a short line that names the task, because a session that a press starts takes its first line as its title. Save with an empty box, or with the default steps, stores no steps of the org, so the action follows later changes of the default. No save is refused, and the steps have no length limit, as the scripts have none.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'prompts' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'edited',
      title: 'Edited action',
      description:
        'Cal saved steps of Acme for Resolve conflicts, because the team rebases: fetch the target branch, rebase on it, resolve each conflict, run the tests, and push with `git push --force-with-lease`. The action shows Edited beside its label, and Reset to default beside Save. Reset to default asks first, as the reset view shows. The other actions keep their default steps.',
      rationale:
        'Prompts decision 1 starts from this case: Resolve conflicts always asked the agent to merge the target branch, also for a team that rebases. The steps of the org take the place of the default steps only, so a press still names the pull request and the target branch, and still asks for no reply on GitHub.',
      props: { prompts: 'edited' },
    },
    {
      slug: 'saving',
      title: 'Save in progress',
      description:
        'Cal typed the rebase steps into the box of Resolve conflicts and pressed Save. Save shows a spinner while the save runs. The box keeps the typed steps, and the other actions stay as they are. After the save, the action shows Edited and Reset to default, as the edited view shows.',
      rationale:
        'Each action has its own Save, so a save changes one action only, and the boxes of the other actions stay open to edits.',
      props: { prompts: 'saving' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, sees the same six actions read-only: the steps as text, the Edited mark of Resolve conflicts, and the part that the app adds. The tab has no Save and no Reset to default. The intro says that only an admin can change the steps.',
      rationale:
        'The user chose option B of decision 57: only admins change what reaches every workspace of the org, such as the scripts. The steps of a press run with the GitHub rights of the member who presses, so only an admin edits them too, as Prompts decision 1 says. Every member still reads them, to know what each action asks the agent to do.',
      props: { prompts: 'edited', viewer: 'member' },
    },
    {
      slug: 'reset',
      title: 'Reset to default',
      description:
        'Cal pressed Reset to default on Resolve conflicts. The question "Reset Resolve conflicts to the default?" says that Reset deletes the steps that Acme saved for this action, and that each press then sends the app\'s default steps. Cancel goes back to the edited tab, and Reset opens the tab with the default steps. On a phone it is a sheet.',
      rationale:
        'A design call of 16 November 2026 under Prompts decision 1: nothing brings the steps of the org back after a reset, so the tab asks first, as Reset all of the keyboard shortcuts does in app/account/shortcuts/changes/reset-all.',
      props: { prompts: 'edited', dialog: 'reset-prompt' },
    },
  ],
})

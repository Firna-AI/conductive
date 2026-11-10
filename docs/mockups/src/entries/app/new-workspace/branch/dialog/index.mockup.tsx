import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const branchDialog = defineScreen({
  title: 'In the dialog',
  description:
    'The New workspace dialog has a quiet branch picker beside the repository picker, which says New branch by default. Here Cal opened it, and the same picker hangs below it, with its search, New branch, the open pull requests, and the branches. A choice keeps the dialog open, and New branch goes back to the dialog as it opens. The phone view is the New workspace page with the picker in a sheet, because a phone always opens the page.',
  rationale:
    'The dialog has no line under its repository picker, so the branch takes a quiet picker beside it, in the same plain style. New branch stays the default, as on the page.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, picker: 'open' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'chosen',
      title: 'Branch chosen',
      description:
        'Cal chose calummoore/oslo-3f8k in the dialog. The picker beside the repository names the branch, and Create makes the workspace on it once the message has text. The phone view is the page with the same choice.',
      props: { branch: 'existing', picker: 'closed' },
    },
    {
      slug: 'pull-request',
      title: 'Pull request chosen',
      description:
        'Cal chose the open pull request #486 in the dialog. The picker beside the repository names it, and the workspace continues its branch. The phone view is the page with the same choice.',
      props: { branch: 'pull-request', picker: 'closed' },
    },
    {
      slug: 'change',
      title: 'Branch kept',
      description:
        'Cal opened the branch picker of the dialog again after choosing calummoore/oslo-3f8k. The branch is still checked.',
      props: { branch: 'existing', picker: 'open' },
    },
    {
      slug: 'pull-request-change',
      title: 'Pull request kept',
      description:
        'Cal opened the branch picker of the dialog again after choosing #486. The pull request is still checked.',
      props: { branch: 'pull-request', picker: 'open' },
    },
  ],
})

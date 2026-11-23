import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const dialogComputerChoice = defineScreen({
  title: 'Computer choice',
  description:
    'The New workspace dialog in Acme, which has own computers. The computer choice follows the branch control in the header, in the plain tone of the pickers of the dialog, and shows Cloud computer, the default. The org and the section keep the end of the header. A phone always opens the page, so each phone view shows the page in the same state. The variants show the open menu, an offline own computer, and a full own computer.',
  rationale:
    'Own computer decision 3 A puts the choice in New workspace, as a page and as a dialog. The dialog keeps the pickers of where the work starts together at the start of its header, as on the page.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message', computer: 'cloud' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'menu',
      title: 'Computer menu',
      description:
        'The menu hangs below the choice, over the message: Cloud computer, checked, then build-01, build-02 full, lab-server offline, and build-03 off until its build is ready.',
      rationale: 'The menu of the dialog is the menu of the page.',
      props: { computerMenu: 'open' },
    },
    {
      slug: 'offline',
      title: 'Offline own computer',
      description:
        'Cal picked lab-server, which is offline. The notice of the page shows above the footer, and Create stays on.',
      rationale:
        'The dialog shows the notices of the page, so the choice reads the same in both.',
      props: { computer: 'offline' },
    },
    {
      slug: 'full',
      title: 'Full own computer',
      description:
        'Cal picked build-02, which is full. The notice of the page shows above the footer, and Create stays on.',
      rationale:
        'Cal chose B of own computer decision 9 on 23 November 2026, so the dialog draws the rule of the page.',
      props: { computer: 'full' },
    },
  ],
})

import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const temporaryValue = defineScreen({
  title: 'A value',
  description:
    'Cal typed a value of MAPBOX_TOKEN, which shows as dots, and kept 15 minutes. The line under the choices says that this session can use it for 15 minutes. On a computer the card holds them, and Allow is on. On a phone, Give a value opened the sheet: the field named MAPBOX_TOKEN, the choice and its line, and Allow across the sheet. Deny stays on the card under the sheet.',
  rationale:
    'Item 4 C of the mockups: a phone keeps the card short, with Deny and Give a value, and the sheet holds the value, the choice of how long it lasts, and Allow. A computer keeps them in the card.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'secret-temporary-value',
    overlay: 'value-sheet',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'workspace',
      title: 'For this workspace',
      description:
        'Cal chose This workspace. The line says that each session of this workspace can use the value until the workspace is archived.',
      props: { conversation: 'secret-temporary-workspace' },
    },
    {
      slug: 'saved',
      title: 'Save as secret',
      description:
        'Cal chose Save as secret. The line says that Allow adds MAPBOX_TOKEN to the secrets of Acme, with the reason of the agent as its description, and that this session can use it.',
      rationale:
        'Save creates an org secret with the name of the request. Its creator is the person who answers, and the session gets an approval for it. Its description is the reason of the agent (item 8 A of the mockups), which its creator and the admins can change in the Replace form of the Secrets tab. Save does not set the mark for all agents, because only admins set it (secrets decision 3 B).',
      props: { conversation: 'secret-temporary-saved' },
    },
  ],
})

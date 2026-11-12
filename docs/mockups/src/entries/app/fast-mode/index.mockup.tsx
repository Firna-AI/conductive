import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const fastMode = defineScreen({
  title: 'Fast mode',
  description:
    'The model menu of Checkout address autocomplete with Fast on. The Fast row comes after the efforts. Its end holds ⇧⌘E, the key of Fast mode, then the switch, and the row has no other text. The trigger reads "Opus 5.5 High Fast". A click or Space changes the switch, and the menu stays open. ⇧⌘E turns fast mode on or off without the menu. A phone shows no key.',
  rationale:
    'The user chose a Fast switch under the effort, as in the model menu of Conductor, on 10 November 2026 (fast mode decision 255). Fast is part of the choice of a message, as the model and the effort are, so the session, the saved default, and a new workspace carry it. Any member who may send in the session may turn it on, as for the model and the effort (fast mode decision 256). The user asked on 11 November 2026 for no extra text about fast mode, so the row has no note. The row shows only for a model that the model list marks as fast. The user chose C of fast mode decision 258 on 12 November 2026: the command Fast mode has ⇧⌘E, the key of Conductor, and the row shows that key at its end, as a row of the palette ends with the key of its command. The key runs where a session tab is shown, so the menus of New workspace and Preferences show no key. As each key hint does, the row shows the key of the person, and a phone shows no key hint.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker', modelChoice: 'fast' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'off',
      title: 'Fast off',
      description:
        'The same menu with Fast off, and the same key. The trigger reads "Opus 5.5 High".',
      rationale:
        'Fast starts off. It stays as a member sets it, as the effort does.',
      props: { modelChoice: 'workspace' },
    },
    {
      slug: 'trigger',
      title: 'Fast on',
      description:
        'The menu is closed, and Fast is on. The trigger reads "Opus 5.5 High Fast", with Fast in the muted colour of the effort. When the bar of a phone is full, Fast gives way with the effort.',
      rationale:
        'The trigger shows the speed, so each member sees before the send that the message runs fast.',
      props: { composer: 'draft' },
    },
    {
      slug: 'no-fast',
      title: 'A model without fast mode',
      description:
        'Sonnet 5.5 offers no fast mode, so its menu ends with the efforts and has no Fast row. A change to such a model turns fast off, and ⇧⌘E does nothing for it.',
      rationale:
        'The menu lists only what the chosen model offers, as it does for the efforts. A change back to a model with fast mode keeps fast off.',
      props: { modelChoice: 'no-fast' },
    },
  ],
})

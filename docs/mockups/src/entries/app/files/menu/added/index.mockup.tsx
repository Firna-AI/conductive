import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const filesMenuAdded = defineScreen({
  title: 'Added to chat',
  description:
    'Cal had the tab of useAddressAutocomplete.ts in view, with a draft in Address autocomplete, and chose Add to chat in the menu of AddressForm.tsx. The app showed Address autocomplete, the session tab that Cal saw last, and put the chip of AddressForm.tsx at the end of the draft, with a space after it. The field has the focus, with the caret after the space, so Cal can type on. While the field of that session shows, the chip goes in at its caret. With no open session tab, Add to chat starts a new session with the chip in its field. On a phone, the app switched from the Files tab to the chat of that session. The field does not take the focus there, so no keyboard opens.',
  rationale:
    'The user chose option A of decision 4 of the file row menu change on 16 November 2026: the session tab that the member saw last gets the chip, and the app shows that tab, so the member sees the chip at once. A field that mounts again has no caret, so the chip goes at the end of the text. The chip and its space are those of a pick from the list of @. A design call of the same day gives the field the focus on desktop only, so a phone opens no keyboard by itself.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'chat',
    composer: 'file-added',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})

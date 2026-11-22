import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountGeneral,
  accountSchema,
} from '../../../../../screens/accountState'

export const modelFavouritesNotSaved = defineScreen({
  title: 'Not saved',
  description:
    'Cal moved Sonnet 5.5 Medium to the top, and the save failed. The list keeps the saved order, and the error under it says "The change wasn\'t saved. Try again." A new move tries again.',
  rationale:
    'Each change saves at once, as in the New workspaces section, so the section has no Save. A failed save keeps the saved list, so the tab never shows favourites that the account does not hold. The error names what failed and asks for a new try, as the error of New workspaces does. Moved here from a saved state of the Edit the favourites page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, tab: 'preferences', save: 'favourites-failed' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})

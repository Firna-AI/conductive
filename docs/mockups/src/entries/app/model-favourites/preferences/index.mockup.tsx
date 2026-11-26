import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const modelFavouritesPreferences = defineScreen({
  title: 'Edit the favourites',
  description:
    'The Favourites section starts the Preferences tab of the account, above New workspaces. It lists the five favourites in the order of the menu. Each row has a handle, the picker of the favourite, and × to remove it. A drag on the handle moves a row. The picker of a row shows the menu with no favourites, which starts with All models, because the row sets one favourite. Add a favourite is off, and a line says that the menu shows five favourites at most. Each change saves at once. The child pages show Add a favourite, the section with no favourite, a hidden favourite, and a failed save.',
  rationale:
    'A favourite is a full choice, so its row uses the picker that sets a model, an effort, and Fast. The order of the list is the order of the menu, so a drag sets it. The user chose A of decision 2 on 20 November 2026: this section is the only place that adds, orders, and removes favourites, so the menu keeps the same rows for each choice. Option B, an "Add to favourites" row in the menu, was not chosen, because the user asked for favourites set up in advance, and the row adds a line to each menu. Moved here from a saved state of the Model favourites page, with the same path, so that page shows only its canonical screen. Its own saved states moved to child pages with the same paths, so this page shows only its canonical screen too.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, tab: 'preferences' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})

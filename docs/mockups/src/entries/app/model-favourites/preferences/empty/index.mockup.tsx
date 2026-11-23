import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountGeneral,
  accountSchema,
} from '../../../../../screens/accountState'

export const modelFavouritesEmpty = defineScreen({
  title: 'No favourites',
  description:
    'Cal removed each favourite. The Favourites section shows no list. In its place, a muted line says "Add a favourite to show it first in the model menu." Add a favourite is on, and it opens the list of every model, as app/model-favourites/preferences/add shows. The account keeps the empty list, so the starting favourites do not come back. The model menu of each picker then starts with All models, then Effort and Fast, as app/model-favourites/no-favourites shows.',
  rationale:
    'On 22 November 2026 the user answered decision 6: a menu with no favourite shows only All models, the efforts, and Fast, because more models will come, and a flat list of every model does not scale. The line in place of the list is a design call of the orchestrator of the same day, after the empty repository order, which says "Select Edit to add a repository." It says what a favourite does, and Add a favourite under it is the next step.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, tab: 'preferences', favourites: 'empty' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})

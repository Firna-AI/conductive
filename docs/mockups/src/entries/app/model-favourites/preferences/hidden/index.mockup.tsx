import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountGeneral,
  accountSchema,
} from '../../../../../screens/accountState'

export const modelFavouritesHidden = defineScreen({
  title: 'A hidden favourite',
  description:
    'The Claude login of Cal runs on Cal\'s proxy, whose model list does not name Fable 5.1. The picker of Fable 5.1 Low is greyed, and the line under it says "Hidden from the model menu, because your endpoint does not list Fable 5.1." The handle still moves the row, and × still removes it. The picker still changes the favourite, so a pick of a model that the list names shows it in the menu again. The favourite stays saved, and the menu also shows it again when the list names Fable 5.1.',
  rationale:
    'A design call of 20 November 2026: a favourite that the menu leaves out stays saved, and Preferences shows it greyed with the reason, so the member can remove it. The menu leaves it out, as app/model-favourites/endpoint shows. Only an own endpoint of the member greys a favourite here, because the account page knows its model lists. A session on the org login follows the list of the org endpoint, which only an admin sees. Moved here from a saved state of the Edit the favourites page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, tab: 'preferences', ownEndpoint: 'unlisted' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})

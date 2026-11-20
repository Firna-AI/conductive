import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const modelFavouritesPreferences = defineScreen({
  title: 'Edit the favourites',
  description:
    'The Favourites section starts the Preferences tab of the account, above New workspaces. It lists the five favourites in the order of the menu. Each row has a handle, the picker of the favourite, and × to remove it. A drag on the handle moves a row. The picker of a row lists every model at its top, as a menu with no favourites does, because the row sets one favourite. Add a favourite is off, and a line says that the menu shows five favourites at most. Each change saves at once.',
  rationale:
    'A favourite is a full choice, so its row uses the picker that sets a model, an effort, and Fast. The order of the list is the order of the menu, so a drag sets it. The user chose A of decision 2 on 20 November 2026: this section is the only place that adds, orders, and removes favourites, so the menu keeps the same rows for each choice. Option B, an "Add to favourites" row in the menu, was not chosen, because the user asked for favourites set up in advance, and the row adds a line to each menu. Moved here from a saved state of the Model favourites page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, tab: 'preferences' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'hidden',
      title: 'A hidden favourite',
      description:
        'The Claude login of Cal runs on Cal\'s proxy, whose model list does not name Fable 5.1. The picker of Fable 5.1 Low is greyed, and the line under it says "Hidden from the model menu, because your endpoint does not list Fable 5.1." The handle still moves the row, and × still removes it. The picker still changes the favourite, so a pick of a model that the list names shows it in the menu again. The favourite stays saved, and the menu also shows it again when the list names Fable 5.1.',
      rationale:
        'A design call of 20 November 2026: a favourite that the menu leaves out stays saved, and Preferences shows it greyed with the reason, so the member can remove it. The menu leaves it out, as app/model-favourites/endpoint shows. Only an own endpoint of the member greys a favourite here, because the account page knows its model lists. A session on the org login follows the list of the org endpoint, which only an admin sees.',
      props: { ownEndpoint: 'unlisted' },
    },
    {
      slug: 'not-saved',
      title: 'Not saved',
      description:
        'Cal moved Sonnet 5.5 Medium to the top, and the save failed. The list keeps the saved order, and the error under it says "The change wasn\'t saved. Try again." A new move tries again.',
      rationale:
        'Each change saves at once, as in the New workspaces section, so the section has no Save. A failed save keeps the saved list, so the tab never shows favourites that the account does not hold. The error names what failed and asks for a new try, as the error of New workspaces does.',
      props: { save: 'favourites-failed' },
    },
  ],
})

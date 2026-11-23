import { defineComponent } from '@mokly/mokly'
import {
  AddFavouriteSheet,
  FavouritesSection,
} from '../../../components/settings/FavouritesSection'
import { unlistedLabels } from '../../../fixtures/endpointModels'
import { favouriteSectionStates } from '../../../fixtures/favourites'

/** The models that the pickers of the member leave out. */
const hiddenModelsSchema = {
  type: 'array',
  items: { type: 'string' },
} as const

/**
 * The Favourites section of Preferences, registered with Mokly. Its pages
 * show the five favourites of Cal, the list of Add a favourite, a hidden
 * favourite, a change that did not save, and no favourite.
 */
export const favouritesSection = defineComponent({
  slug: 'favourites-section',
  title: 'Favourites section',
  description:
    'The Favourites section of Preferences: up to five favourites, which the model menu lists first, in this order. Each row has a handle, the picker of the favourite, whose menu starts with All models, and × to remove it. Each change saves at once. Add a favourite opens the list of every model below the button on a computer, and a phone opens it in a sheet. It is off while the list holds five. A favourite on a model that the pickers of the member leave out shows greyed, with a line that says why. With no favourite, a muted line takes the place of the list. Its own page shows the five favourites of Cal.',
  relatedDocs: ['docs/mockups/design-model-menu.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The state of the section, and with it the favourites of its list. */
      favourites: { enum: favouriteSectionStates },
      hiddenModels: hiddenModelsSchema,
      /** The save of the last change failed. */
      saveFailed: { type: 'boolean' },
    },
  } as const,
  props: { favourites: 'saved' },
  render: (props) => (
    <FavouritesSection
      favourites={props.favourites}
      hiddenModels={props.hiddenModels}
      saveFailed={props.saveFailed}
    />
  ),
  variants: [
    {
      slug: 'add',
      title: 'Add a favourite',
      description:
        'Four favourites, so Add a favourite is on. Its list of every model is open below the button, with the pointer on Opus 5.5.',
      props: { favourites: 'add-open' },
    },
    {
      slug: 'hidden',
      title: 'A hidden favourite',
      description:
        'The own endpoint of Cal does not list Fable 5.1, so its favourite shows greyed, with a line that says why. Its handle, its picker, and × still work.',
      props: { hiddenModels: [...unlistedLabels] },
    },
    {
      slug: 'not-saved',
      title: 'Change not saved',
      description:
        'A change that the app did not save: its error under the list, which keeps the saved favourites.',
      props: { saveFailed: true },
    },
    {
      slug: 'empty',
      title: 'No favourites',
      description:
        'Cal removed each favourite, so a muted line takes the place of the list, and Add a favourite is on.',
      props: { favourites: 'empty' },
    },
  ],
})

/**
 * The list of Add a favourite in a phone sheet, registered with Mokly. Its
 * own page shows the list of every model.
 */
export const addFavouriteSheet = defineComponent({
  slug: 'add-favourite-sheet',
  title: 'Add favourite sheet',
  description:
    'The list of Add a favourite in a phone sheet: every model in the groups of All models, with no mark, no efforts, and no Fast row. The list is a menu of the Favourites section, not a model picker, so it stays a sheet on a phone. The pointer is on Opus 5.5. Its own page shows each model of the app.',
  relatedDocs: ['docs/mockups/design-model-menu.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: { hiddenModels: hiddenModelsSchema },
  } as const,
  render: (props) => <AddFavouriteSheet hiddenModels={props.hiddenModels} />,
})

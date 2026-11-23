import { defineComponent } from '@mokly/mokly'
import type { PickerPlacement } from '../../../components/chat/FavouritesMenu'
import { ModelPicker } from '../../../components/chat/ModelPicker'
import { agentKeys, defaultChoice } from '../../../fixtures/agents'
import { noFavourites } from '../../../fixtures/favourites'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'

/** Where the menu of the picker opens, as `PickerPlacement` lists them. */
const placements = [
  'below-start',
  'below-end',
  'above-start',
  'above-end',
] as const satisfies readonly PickerPlacement[]

/**
 * The picker of the model and the effort, registered with Mokly. Its pages
 * show the picker, fast mode, and the menu open: with the favourites, with
 * the submenu of All models, with the submenu of Effort, and with no
 * favourite.
 */
export const modelPicker = defineComponent({
  slug: 'model-picker',
  title: 'Model picker',
  description:
    'One picker for the model and the effort of the next message, such as "Opus 5.5 High". The effort shows in a muted colour, and so does "Fast" after it while fast mode is on. Its menu lists the favourites of the viewer first, then All models, which opens the submenu of every model, then Effort, which shows the current effort and opens the submenu of the efforts, then Fast. With no favourite, the menu starts with All models. In a session with messages, a model or a favourite of the other agent opens a new session. A screen can supply an open menu in place of the model menu, such as nothing where the screen draws the menu above the page. Its own page shows the default choice.',
  relatedDocs: ['docs/mockups/design-model-menu.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['choice'],
    properties: {
      choice: agentChoiceSchema,
      /** The menu is open. */
      open: { type: 'boolean' },
      /** Where the menu opens. */
      placement: { enum: placements },
      /** The agent of a session with messages. */
      sessionAgent: { enum: agentKeys },
      /** The models that the menu leaves out. */
      hiddenModels: { type: 'array', items: { type: 'string' } },
      /** The picker of a session tab, whose Fast row shows its key. */
      fastKey: { type: 'boolean' },
      /**
       * The favourites of the menu, by default those of the viewer. With
       * none, the menu starts with All models.
       */
      favourites: { type: 'array', items: agentChoiceSchema },
      /** The submenu of All models is open. */
      allModels: { type: 'boolean' },
      /** The submenu of Effort is open. */
      effort: { type: 'boolean' },
    },
  } as const,
  slots: ['menu'],
  props: { choice: defaultChoice },
  render: (props) => (
    <ModelPicker
      allModels={props.allModels}
      choice={props.choice}
      effort={props.effort}
      fastKey={props.fastKey}
      favourites={props.favourites}
      hiddenModels={props.hiddenModels}
      menu={props.menu}
      open={props.open}
      placement={props.placement}
      sessionAgent={props.sessionAgent}
    />
  ),
  variants: [
    {
      slug: 'fast',
      title: 'Fast mode',
      description: 'Fast mode is on, so "Fast" follows the effort.',
      props: { choice: { ...defaultChoice, fast: true } },
    },
    {
      slug: 'open',
      title: 'Menu open',
      description:
        'The menu below the picker: the favourites of the viewer, the current one marked, then All models, Effort with the current effort, and Fast.',
      props: { open: true, placement: 'below-start' },
    },
    {
      slug: 'all-models',
      title: 'All models open',
      description:
        'The submenu of All models beside the menu, level with its row, with the models of each agent and the current model marked.',
      props: { open: true, placement: 'below-start', allModels: true },
    },
    {
      slug: 'effort',
      title: 'Effort open',
      description:
        'The submenu of Effort beside the menu, level with its row, with the efforts of the current model and the current effort marked. The Effort row shows the current effort in the muted colour.',
      props: { open: true, placement: 'below-start', effort: true },
    },
    {
      slug: 'no-favourites',
      title: 'No favourites',
      description:
        'The menu with no favourite, as the picker of a Favourites row shows it: All models first, then Effort and Fast.',
      props: { open: true, placement: 'below-start', favourites: noFavourites },
    },
  ],
})

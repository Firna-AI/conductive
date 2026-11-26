import { defineScreen } from '@mokly/mokly'
import { MenuPlacementScreen } from '../../../../screens/MenuPlacementScreen'

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['menu'],
  properties: {
    /** The open menu: Model and effort, Session history, or More ways to allow. */
    menu: { enum: ['model', 'history', 'allow'] },
  },
} as const

export const chatMenuPlacement = defineScreen({
  title: 'Menu placement',
  description:
    'Four commands wait in the stack above the composer. The long script on top scrolls inside its card and fades where the card cuts it. The model menu is open with the favourites first, as app/model-favourites gives. It shows whole above its picker, over the stack and the chat, from the start of the picker. On a phone the menu opens in the same place.',
  rationale:
    'Option B of the follow-up item about menus that a box can cut: every menu beside its button opens on one surface above every box of the page, as the menus of the shell and of the members already do. So no box that clips or scrolls cuts a menu, whatever box holds its button. A menu opens on the side of its placement when it fits there, otherwise on the side with more room, and it gets shorter to fit that room. It stays inside the window. Its choices, its keys, and its layout on a phone do not change. A view runs no script, so the screen draws the open menu above the page, and CSS places it at its picker.',
  relatedDocs: [],
  propSchema: schema,
  props: { menu: 'model' },
  render: (props, context) => (
    <MenuPlacementScreen menu={props.menu} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'history',
      title: 'Session history',
      description:
        'The tab row is full. It scrolls sideways, and a fade marks its start, where it cuts tabs. The session history is open. It shows whole below the clock, over the chat, to the end of the clock. On a phone the history is a sheet, as app/sessions/history shows.',
      rationale:
        'The history keeps its rows, its width, and its height limit. Only the layer that it opens in changes, as for the model menu.',
      props: { menu: 'history' },
    },
    {
      slug: 'allow',
      title: 'More ways to allow',
      description:
        'In the Mac app, the four commands wait in the stack above the composer, and the long script on top scrolls inside its card, which fades. The arrow beside Allow of that request is open. Its menu shows whole above the actions, outside the card, over the stack and the chat, to the end of the arrow. The Mac app has no phone layout, so a phone view shows the same screen, smaller.',
      rationale:
        'The menu of Allow already opened above the region, so the region never cut it (7 November 2026). It now opens on the same surface as the other menus, with the same placement: above the actions when it fits there, otherwise on the side with more room. A narrow request still opens it from the start of its actions, inside their width. Its choices and their scopes do not change (decision 62).',
      props: { menu: 'allow' },
    },
  ],
})

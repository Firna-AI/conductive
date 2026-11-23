import { defineComponent } from '@mokly/mokly'
import {
  PlacedModelAnchor,
  PlacedModelMenu,
} from '../../../components/chat/PlacedModelMenu'
import { agentKeys, defaultChoice } from '../../../fixtures/agents'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'

/**
 * The open model menu that a screen draws above the page at its picker,
 * registered with Mokly. A page of a part has no picker to place the menu
 * at, so its pages show the menu at the top of the page.
 */
export const placedModelMenu = defineComponent({
  slug: 'placed-model-menu',
  title: 'Placed model menu',
  description:
    'The open model menu of a picker, drawn above the page at the picker, as the app opens a menu in the top layer of the browser, so no box that clips or scrolls cuts it. It lists the favourites of the viewer first, then All models, Effort, and Fast. It opens on the side of its placement when it fits there, otherwise on the other side. Its own page shows the menu of the default of new workspaces, with no picker to place it at.',
  relatedDocs: ['docs/mockups/design-model-menu.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['choice', 'placement'],
    properties: {
      choice: agentChoiceSchema,
      /** The side of the picker that the menu opens on when it fits there. */
      placement: { enum: ['above', 'below'] },
      /** The agent of a session with messages. */
      sessionAgent: { enum: agentKeys },
      /** The menu of a session tab, whose Fast row shows its key. */
      fastKey: { type: 'boolean' },
    },
  } as const,
  props: { choice: defaultChoice, placement: 'below' },
  render: (props) => (
    <PlacedModelMenu
      choice={props.choice}
      fastKey={props.fastKey}
      placement={props.placement}
      sessionAgent={props.sessionAgent}
    />
  ),
  variants: [
    {
      slug: 'session',
      title: 'In a session',
      description:
        'The menu of the composer of a session with messages: a favourite of the other agent opens a new session, and the Fast row shows its key on a computer.',
      props: { placement: 'above', sessionAgent: 'claude', fastKey: true },
    },
  ],
})

/**
 * The place of an open model picker whose menu the screen draws above the
 * page, registered with Mokly. A screen supplies the picker in the
 * `children` slot.
 */
export const placedModelAnchor = defineComponent({
  slug: 'placed-model-anchor',
  title: 'Placed model anchor',
  description:
    'The place of an open model picker whose menu the screen draws above the page: it names the picker as the anchor of that menu. A screen supplies the picker, so its own page shows the empty place.',
  relatedDocs: ['docs/mockups/design-model-menu.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['children'],
  render: (props) => <PlacedModelAnchor>{props.children}</PlacedModelAnchor>,
})

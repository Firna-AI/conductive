import { defineComponent } from '@mokly/mokly'
import { DefaultsSection } from '../../../components/settings/PreferencesSections'
import { fastChoice } from '../../../fixtures/agents'
import { placedModelMenu } from '../chat/PlacedModelMenu.mockup'

/** The New workspaces section of Preferences, registered with Mokly. */
export const defaultsSection = defineComponent({
  slug: 'defaults-section',
  title: 'Defaults section',
  description:
    'The New workspaces section of Preferences: the model, the effort, and the speed that new workspaces start with, and whether New workspace opens as the page or as a dialog on a computer. Each change saves at once. A failed save shows its error under the choice and keeps the saved choice. The open menu of the model picker lies above the page, at the picker, so the box of the page does not cut it. Its own page shows the page view.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['view', 'saveFailed'],
    properties: {
      /** How New workspace opens on a computer. */
      view: { enum: ['page', 'dialog'] },
      /** The save of the last change failed. */
      saveFailed: { type: 'boolean' },
      /** The model picker is open, with fast mode on. */
      fastMenu: { type: 'boolean' },
      /**
       * The page of the part draws the open menu at the picker. A screen
       * draws the menu above the page, so only the own pages pass it.
       */
      drawMenu: { type: 'boolean' },
    },
  } as const,
  props: { view: 'page', saveFailed: false },
  render: (props) => (
    <>
      <DefaultsSection
        fastMenu={props.fastMenu}
        saveFailed={props.saveFailed}
        view={props.view}
      />
      {props.fastMenu && props.drawMenu ? (
        <placedModelMenu.Component
          choice={fastChoice}
          moklyInstance="default-model-menu"
          placement="below"
        />
      ) : null}
    </>
  ),
  variants: [
    {
      slug: 'dialog',
      title: 'Dialog',
      description: 'New workspace opens as a dialog over the current screen.',
      props: { view: 'dialog' },
    },
    {
      slug: 'save-failed',
      title: 'Save failed',
      description:
        'A change that did not save: its error under the choice, which keeps the saved value.',
      props: { saveFailed: true },
    },
    {
      slug: 'fast-menu',
      title: 'Model menu',
      description:
        'The menu of the model picker open below it, with fast mode on: the favourites of the viewer, All models, Effort, and Fast.',
      props: { fastMenu: true, drawMenu: true },
    },
  ],
})

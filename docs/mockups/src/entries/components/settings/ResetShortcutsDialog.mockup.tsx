import { defineComponent } from '@mokly/mokly'
import { ResetShortcutsDialog } from '../../../components/settings/ResetShortcutsDialog'
import { editedShortcuts } from '../../../fixtures/shortcutChanges'
import { shortcutHosts } from '../common/shortcutSchemas'
import { viewports } from '../common/viewports'

/**
 * The question before Reset all, drawn open, registered with Mokly. A
 * screen that draws a screen of another viewport passes `viewport`.
 * Without it, a page of the dialog draws the layout of its own view.
 */
export const resetShortcutsDialog = defineComponent({
  slug: 'reset-shortcuts-dialog',
  title: 'Reset shortcuts dialog',
  description:
    'The question before Reset all on the Keyboard shortcuts tab: how many commands get their default shortcuts again, wherever the person uses the app with the same keyboard. Cancel goes back to the changes, and Reset all to the tab. On a phone the dialog opens as a sheet. Its own page shows the changes of a Mac keyboard.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['changed', 'host'],
    properties: {
      /** The number of commands with a change. */
      changed: { type: 'integer', minimum: 0 },
      /** Where the app runs, which sets the keyboard of the changes. */
      host: { enum: shortcutHosts },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { changed: Object.keys(editedShortcuts).length, host: 'chrome-mac' },
  render: (props, context) => (
    <ResetShortcutsDialog
      changed={props.changed}
      host={props.host}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'windows',
      title: 'Windows keyboard',
      description:
        'One change of the keyboard of Windows and Linux, whose tab draws no page of the changes.',
      props: { changed: 1, host: 'chrome-windows' },
    },
  ],
})

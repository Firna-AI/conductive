import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../../screens/MacAppScreen'

export const macShortcutsChanges = defineScreen({
  title: 'Changes',
  description:
    'After a few changes: ⇧⌘P opens the palette, Replace gave ⌘/ to Keyboard shortcuts, and Model picker has no shortcut. Each changed row shows Reset, which gives the command its default shortcuts again. Reset all, at the top, asks first. The Search row of the sidebar shows ⇧⌘P.',
  rationale:
    'Each change saves at once, as Preferences does, so the tab has no Save. The account holds only the changes (decision 190), so Reset removes the change of one command.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'shortcuts',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcuts: 'edited',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'reset-all',
      title: 'Reset all',
      description:
        'Reset all asks first, in a dialog over the account. The three changed commands get their default shortcuts again, wherever the person uses Conductive on a Mac. Cancel keeps the changes.',
      rationale:
        'Nothing brings the changes back after Reset all, so the tab asks first, as ConfirmDialog does before each action that a person cannot simply undo. Reset all covers the changes of a Mac keyboard, which follow the account to every Mac (decision 190).',
      props: { keyChange: 'reset-all' },
    },
    {
      slug: 'not-saved',
      title: 'Not saved',
      description:
        'The person recorded ⇧⌘P for Command palette, and the save failed. The row keeps ⌘K, the saved shortcut, and says that ⇧⌘P was not saved. A new recording of ⇧⌘P tries again.',
      rationale:
        'A failed save keeps the saved shortcuts, as Preferences does, so the tab never shows a shortcut that the account does not hold.',
      props: { keyChange: 'not-saved', shortcuts: 'default' },
    },
  ],
})

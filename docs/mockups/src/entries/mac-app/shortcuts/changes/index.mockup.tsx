import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../../screens/MacAppScreen'

export const macShortcutsChanges = defineScreen({
  title: 'Changes',
  description:
    'After a few changes: ⇧⌘P opens the palette, Replace gave ⌘/ to Keyboard shortcuts, and Model picker has no shortcut. Replace also took ⇧⌘P from Create PR, which keeps ⌥⇧⌘P. Each changed row shows Reset, which gives the command its default shortcuts again. Reset all, at the top, asks first. The Search row of the sidebar shows ⇧⌘P.',
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
    shortcutSearch: 'none',
    shortcuts: 'edited',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'reset-conflict',
      title: 'Default shortcut in use',
      description:
        'A search for “model” finds Model picker, which has no shortcut, because Replace gave ⌘/ to Keyboard shortcuts. The person pressed Reset on Model picker. Its default ⌘/ belongs to Keyboard shortcuts now, so the row shows ⌘/ in the field of the recorder, and the line under it says that Keyboard shortcuts uses ⌘/. Replace gives Model picker its default shortcut and takes ⌘/ from Keyboard shortcuts, which then has no shortcut. Cancel keeps both commands as they were.',
      rationale:
        'The agent call of 10 November 2026 makes Reset follow the conflict rule of a recorded shortcut: two commands that can run in the same place never share a shortcut, so Reset asks before it takes a shortcut from another command. Replace saves both rows in one change. The field shows the shortcut that waits for the answer, as it does for a recorded shortcut. The search brings the row of Model picker, at the end of the list, to the top of the screen. Reset asks in the same way without a search.',
      props: { keyChange: 'reset-conflict', shortcutSearch: 'one-command' },
    },
    {
      slug: 'reset-all',
      title: 'Reset all',
      description:
        'Reset all asks first, in a dialog over the account. The four changed commands get their default shortcuts again, wherever the person uses Conductive on a Mac. Cancel keeps the changes.',
      rationale:
        'Nothing brings the changes back after Reset all, so the tab asks first, as ConfirmDialog does before each action that a person cannot simply undo. Reset all covers the changes of a Mac keyboard, which follow the account to every Mac (decision 190).',
      props: { keyChange: 'reset-all' },
    },
    {
      slug: 'reset-all-failed',
      title: 'Reset all failed',
      description:
        'The person confirmed Reset all, and the save failed. Each changed row keeps its change and its Reset. A line under the lines and Reset all says that the shortcuts were not reset, and asks the person to try again.',
      rationale:
        'Reset all saves every command in one change, so it fails as a whole, and its error stands under Reset all, not on a row. The agent call of 10 November 2026 asks each error to name what failed. A failed save keeps the saved shortcuts, so the tab never shows a shortcut that the account does not hold.',
      props: { keyChange: 'reset-all-failed' },
    },
    {
      slug: 'not-saved',
      title: 'Not saved',
      description:
        'The person recorded ⇧⌘P for Command palette, which Create PR uses, and pressed Replace. The save failed, so the row keeps ⌘K, the saved shortcut, and says that ⇧⌘P was not saved. Create PR keeps ⇧⌘P. A new recording of ⇧⌘P tries again.',
      rationale:
        'A failed save keeps the saved shortcuts, as Preferences does, so the tab never shows a shortcut that the account does not hold. Replace saves both commands in one change, so a failed save changes neither of them.',
      props: { keyChange: 'not-saved', shortcuts: 'default' },
    },
  ],
})

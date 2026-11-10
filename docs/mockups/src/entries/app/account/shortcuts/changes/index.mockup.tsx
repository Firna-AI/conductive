import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../../brand'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsChanges = defineScreen({
  title: 'Changes',
  description:
    'After a few changes, in a normal Chrome tab on a Mac: ⇧⌘P opens the palette, Replace gave ⌘/ to Keyboard shortcuts, and Model picker has no shortcut. Each changed row shows Reset, and Reset all follows the lines at the top. On a phone, Reset stays beside the label.',
  rationale:
    'The account holds the changes of each keyboard (decision 190, 9 November 2026), so the changes that the person made in the Mac app show in each browser on a Mac, and the other way round.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, shortcuts: 'edited' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'reset-conflict',
      title: 'Default shortcut in use',
      description:
        'A search for “model” finds Model picker, which has no shortcut, because Replace gave ⌘/ to Keyboard shortcuts. The person pressed Reset on Model picker, and its default ⌘/ belongs to Keyboard shortcuts now. The row shows ⌘/ in the field of the recorder, with Replace and Cancel, and the line under it says that Keyboard shortcuts uses ⌘/. On a phone, the field, Replace, and Cancel take the line under the label.',
      rationale:
        'The agent call of 10 November 2026 makes Reset follow the conflict rule of a recorded shortcut, in every host. Replace gives Model picker its default shortcut and takes ⌘/ from Keyboard shortcuts in one change. The search brings the row of Model picker, at the end of the list, to the top of the screen.',
      props: { keyChange: 'reset-conflict', shortcutSearch: 'one-command' },
    },
    {
      slug: 'reset-all',
      title: 'Reset all',
      description: `Reset all asks first: a dialog over the account on desktop, and a sheet on a phone. The three changed commands get their default shortcuts again, wherever the person uses ${productName} on a Mac. Cancel keeps the changes.`,
      rationale:
        'Nothing brings the changes back after Reset all, so the tab asks first with ConfirmDialog, which is a sheet on a phone.',
      props: { keyChange: 'reset-all' },
    },
    {
      slug: 'reset-all-failed',
      title: 'Reset all failed',
      description:
        'The person confirmed Reset all, and the save failed. Each changed row keeps its change and its Reset. A line under the lines and Reset all says that the shortcuts were not reset, and asks the person to try again. On a phone, the line takes the full width under Reset all.',
      rationale:
        'Reset all saves every command in one change, so it fails as a whole, and its error stands under Reset all, not on a row. The agent call of 10 November 2026 asks each error to name what failed.',
      props: { keyChange: 'reset-all-failed' },
    },
    {
      slug: 'not-saved',
      title: 'Not saved',
      description:
        'The person recorded ⇧⌘P for Command palette, and the save failed. The row keeps ⌘K, the saved shortcut, and says that ⇧⌘P was not saved.',
      rationale:
        'A failed save keeps the saved shortcuts, as Preferences does, so the tab never shows a shortcut that the account does not hold.',
      props: { keyChange: 'not-saved', shortcuts: 'default' },
    },
  ],
})

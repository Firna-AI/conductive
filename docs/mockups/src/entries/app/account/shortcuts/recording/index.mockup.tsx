import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsRecording = defineScreen({
  title: 'Recording',
  description:
    'A press on ⌥⌘/ of Keyboard shortcuts starts the recorder in its place, in a normal Chrome tab on a Mac. The recorder asks for the keys. Remove, beside Cancel, takes ⌥⌘/ off Keyboard shortcuts, and Cancel or Esc stops the recorder. On a phone, the recorder, Remove, and Cancel take the line under the label.',
  rationale:
    'The changes follow the account (decision 190, 9 November 2026), so a browser records keys as the Mac app does. The recorder and Remove save at once, as Preferences does. The agent call of 10 November 2026 chose a Remove button over Backspace in the recorder: a person can see the button, and can still record ⌫ as a shortcut. The page draws the layouts of a phone, which the Mac app does not have.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, keyChange: 'recording' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'adding',
      title: 'One more shortcut',
      description:
        'A press on + of Keyboard shortcuts starts the recorder after ⌥⌘/, in a normal Chrome tab on a Mac. ⌥⌘/ stays, and the recorder shows only Cancel. On a phone, ⌥⌘/, the recorder, and Cancel take the line under the label.',
      rationale:
        'A recorder that adds a shortcut, from + or Add shortcut, replaces none, so it has no Remove, in every host.',
      props: { keyChange: 'adding' },
    },
    {
      slug: 'fixed-key',
      title: 'Fixed shortcut pressed',
      description:
        'The person pressed ⌘Z while the recorder waited. ⌘Z is Undo in the text fields, a fixed shortcut, so the recorder did not take it. The row says that Undo always uses ⌘Z, and the recorder still waits for other keys, with Remove and Cancel.',
      rationale:
        'The user asked on 10 November 2026 that the shortcuts not take the keys of the message field, so the recorder treats the text keys of the system as fixed. A browser has no menus of the Mac app, so a text key is the example here.',
      props: { keyChange: 'refused' },
    },
    {
      slug: 'conflict',
      title: 'Shortcut in use',
      description:
        'The person pressed ⌘/, which Model picker uses. The recorder shows ⌘/, and the line under the row says that Model picker uses it. The row offers only Replace and Cancel. On a phone, the recorder, Replace, and Cancel take the line under the label, and the line about Model picker follows them.',
      rationale:
        'Two commands that can run in the same place never share a shortcut, in every host. Replace saves both rows in one change. The conflict rule offers Replace and Cancel, so Remove leaves the row while it names Model picker.',
      props: { keyChange: 'conflict' },
    },
  ],
})

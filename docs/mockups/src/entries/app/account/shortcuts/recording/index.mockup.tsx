import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsRecording = defineScreen({
  title: 'Recording',
  description:
    'A press on ⌥⌘/ of Keyboard shortcuts starts the recorder in its place, in a normal Chrome tab on a Mac. The recorder asks for the keys, and Cancel or Esc stops it. On a phone, Cancel stays beside the label, and the recorder takes the line of the shortcuts.',
  rationale:
    'The changes follow the account (decision 190, 9 November 2026), so a browser records keys as the Mac app does. The recorder saves at once, as Preferences does. The page draws the layouts of a phone, which the Mac app does not have.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, keyChange: 'recording' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'fixed-key',
      title: 'Fixed shortcut pressed',
      description:
        'The person pressed ⌘Z while the recorder waited. ⌘Z is Undo in the text fields, a fixed shortcut, so the recorder did not take it. The row says that Undo always uses ⌘Z, and the recorder still waits for other keys.',
      rationale:
        'The user asked on 10 November 2026 that the shortcuts not take the keys of the message field, so the recorder treats the text keys of the system as fixed. A browser has no menus of the Mac app, so a text key is the example here.',
      props: { keyChange: 'refused' },
    },
    {
      slug: 'conflict',
      title: 'Shortcut in use',
      description:
        'The person pressed ⌘/, which Model picker uses. The recorder shows ⌘/, and the line under the row says that Model picker uses it. On a phone, Replace and Cancel stay beside the label.',
      rationale:
        'Two commands that can run in the same place never share a shortcut, in every host. Replace saves both rows in one change.',
      props: { keyChange: 'conflict' },
    },
  ],
})

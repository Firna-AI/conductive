import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../../screens/MacAppScreen'

export const macShortcutsRecording = defineScreen({
  title: 'Recording',
  description:
    'A press on ⌥⌘/ of Keyboard shortcuts starts the recorder in its place. The recorder asks for the keys, and the next keys that the person presses become the new shortcut. Remove, beside Cancel, takes ⌥⌘/ off Keyboard shortcuts. Cancel or Esc stops the recorder without a change.',
  rationale:
    'Each change saves at once, as Preferences does, so the recorder has no Save, and Remove saves at once too. A command can lose every shortcut this way. The agent call of 10 November 2026 chose a Remove button over Backspace in the recorder: a person can see the button, and can still record ⌫ as a shortcut. Esc stops the recorder, so Esc stays a fixed shortcut.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'shortcuts',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'recording',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'adding',
      title: 'One more shortcut',
      description:
        'A press on + of Keyboard shortcuts starts the recorder after ⌥⌘/. ⌥⌘/ stays, and the next keys that the person presses become one more shortcut of the command. The recorder shows only Cancel.',
      rationale:
        'Remove takes off the shortcut that the recorder replaces. A recorder that adds a shortcut, from + or Add shortcut, replaces none, so it has nothing to remove. A command holds at most four shortcuts, so a row with four shows no +.',
      props: { keyChange: 'adding' },
    },
    {
      slug: 'fixed-key',
      title: 'Fixed shortcut pressed',
      description:
        'The person pressed ⌘H while the recorder waited. ⌘H is a fixed shortcut, so the recorder did not take it. The row says that Hide Conductive always uses ⌘H, and the recorder still waits for other keys, with Remove and Cancel.',
      rationale:
        'The recorder never takes a fixed shortcut. It names the command of that shortcut, so the person knows why, and presses other keys.',
      props: { keyChange: 'refused' },
    },
    {
      slug: 'conflict',
      title: 'Shortcut in use',
      description:
        'The person pressed ⌘/, which Model picker uses, and both commands run in a workspace. The recorder shows ⌘/, and the row says that Model picker uses it. Replace moves ⌘/ from Model picker to Keyboard shortcuts. Cancel keeps both commands as they were, and another press records other keys. The row offers only Replace and Cancel.',
      rationale:
        'Two commands that can run in the same place never share a shortcut. Replace saves both rows in one change, so a failed save never leaves the shortcut on both commands, or on neither. The conflict rule offers Replace and Cancel, so Remove leaves the row while it names Model picker: beside the line about ⌘/, Remove could read as a removal of ⌘/ from Model picker.',
      props: { keyChange: 'conflict' },
    },
  ],
})

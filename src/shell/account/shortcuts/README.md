# Keyboard shortcuts tab

This area holds the Keyboard shortcuts tab of the Account page, at
`/account/shortcuts`. The tab lists each command with its keys on the
keyboard of the device, with the changes of the person, and the fixed
keys. A person records, replaces, removes, and resets keys there. Each
change saves at once through the account. The
[settings tab protocol](../../../../docs/protocol/keyboard-shortcuts-tab.md)
gives the rules. The mockups `app/account/shortcuts` and
`mac-app/shortcuts` draw the tab.

## How the tab works

- The rows come from the [shortcut model](../../../app/shortcuts/README.md):
  the commands with their groups, labels, and search words, and the keys
  of `useShortcutKeymap`, the keymap of the
  [shortcut layer](../../shortcuts/README.md). The fixed rows, with their
  labels, live in `fixed-rows.ts`. Each key of a fixed row is a fixed key
  of the model, so the recorder refuses each key that the tab marks fixed.
- A browser leaves out the rows and the group that only the Mac app has.
- The search keeps the rows whose label or words hold each word of the
  query, with the matcher of the palette, in the order of the tab.
- In a normal browser tab, a key that does not work there is dimmed, as
  `shortcutKeyAvailability` of the model says, and one line names where
  it works.
- The recorder is a field that takes the focus and each key that reaches
  it. While it shows, the shortcut layer runs no command. Escape and
  Cancel end it. Tab and Shift+Tab move the focus, such as to Remove and
  Cancel, so the recorder takes no plain Tab.
- A recorded key that another command holds waits in the recorder, with
  Replace and Cancel. Reset asks the same question when another command
  holds a default key of the command.
- Each save sends one batch for the keyboard, through
  `AccountModel.saveShortcuts`. A command whose keys equal its defaults
  saves as a reset, so the account holds only the changes. One save runs
  at a time, and the controls are off meanwhile.
- The rows show only the keys that the account holds. A failed save keeps
  them, and its row says what failed. A failed Reset all says so under
  Reset all.
- After an edit, the focus goes to the control that took the place of the
  recorder: the new key, the next key, or Add shortcut. After Reset all,
  the search field takes it.

## Checks

```sh
npm run test -- src/shell/account/shortcuts
```

`ShortcutRecorder.test.tsx` and `ShortcutsTab.test.tsx` mount the whole
app in a Chrome tab on a Mac, over the fake API, with
`shortcuts-test-kit.ts`. The fake answers each save with the reply that
the test sets, so each test also checks the request that the tab sent.
`tab-rows.test.ts` checks the rows of each host in Node.

### Key Code

- [ShortcutsTab.tsx](ShortcutsTab.tsx): `ShortcutsTab`, the search, the
  intro, and the groups.
- [use-shortcut-editor.ts](use-shortcut-editor.ts): `useShortcutEditor`,
  the recorder, Replace, Remove, Reset, Reset all, the saves, the errors,
  and the focus after an edit. [shortcut-edit.ts](shortcut-edit.ts) holds
  its types.
- [tab-rows.ts](tab-rows.ts): `shortcutGroups`, `matchingGroups`,
  `fixedKeyLabel`, `keptBy`, and `dimmedKeysLine`.
- [tab-edits.ts](tab-edits.ts): `saveOf` and `resetAllOf`, the batches of
  the saves.
- [CommandRow.tsx](CommandRow.tsx) and [RowStates.tsx](RowStates.tsx): the
  row of a command in each state, and the fixed row.
- [ShortcutParts.tsx](ShortcutParts.tsx): `Recorder`, `KeyButton`, and the
  lines under a row. [ShortcutIntro.tsx](ShortcutIntro.tsx): the lines,
  Reset all, and its question.

### Related Docs

- [Keyboard shortcuts: the settings tab](../../../../docs/protocol/keyboard-shortcuts-tab.md)
- [Keyboard shortcuts](../../../../docs/protocol/keyboard-shortcuts.md)
- [Keyboard shortcuts: the keys](../../../../docs/protocol/keyboard-shortcuts-keys.md)

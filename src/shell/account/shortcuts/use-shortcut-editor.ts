import { useState } from 'react'
import { defaultShortcutKeys } from '../../../app/shortcuts/defaults'
import {
  replaceShortcutKeys,
  shortcutConflicts,
  type ShortcutKeymap,
} from '../../../app/shortcuts/keymap'
import {
  shortcutFromPress,
  type ShortcutPress,
} from '../../../app/shortcuts/keys'
import type { ShortcutCommandId } from '../../../shared/shortcut-commands'
import { isFixedShortcut } from '../../../shared/shortcut-fixed'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../../shared/shortcut-key'
import type {
  SaveShortcutsRequest,
  ShortcutChange,
} from '../../../shared/shortcuts'
import { useApp } from '../../context'
import type {
  FailedSave,
  FocusTarget,
  Recording,
  SaveAction,
  ShortcutEditor,
} from './shortcut-edit'
import { recordedKeys, removedKeys, resetAllOf, saveOf } from './tab-edits'

/** A save that runs, with its action and its row. */
interface Saving {
  readonly action: SaveAction
  /** The row of the save, or null for Reset all. */
  readonly command: ShortcutCommandId | null
}

/** A save, with the focus after it, and the error and the focus after a failure. */
interface SavePlan extends Saving {
  readonly done: FocusTarget | null
  readonly failure: FailedSave
  readonly back: FocusTarget | null
}

/**
 * The edits of the Keyboard shortcuts tab on the keyboard of the device.
 * Each change saves at once through the account, in one batch, and the
 * rows show the keys that the account holds, so a failed save keeps the
 * saved keys. One save runs at a time.
 */
export function useShortcutEditor(
  keyboard: ShortcutKeyboard,
  keymap: ShortcutKeymap,
  changes: readonly ShortcutChange[],
): ShortcutEditor {
  const app = useApp()
  const [edit, setEdit] = useState<ShortcutEditor['edit']>(null)
  const [saving, setSaving] = useState<Saving | null>(null)
  const [failed, setFailed] = useState<FailedSave | null>(null)
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const keysOf = (command: ShortcutCommandId) => keymap.get(command) ?? []
  const placeOf = (command: ShortcutCommandId, key?: ShortcutKeyText) =>
    key === undefined ? 'add' : keysOf(command).indexOf(key)

  async function save(
    request: SaveShortcutsRequest,
    after: SavePlan,
  ): Promise<boolean> {
    setSaving({ action: after.action, command: after.command })
    setFailed(null)
    try {
      await app.account.saveShortcuts(request)
      setFocus(after.done)
      return true
    } catch {
      setFailed(after.failure)
      setFocus(after.back)
      return false
    } finally {
      setEdit(null)
      setSaving(null)
    }
  }

  /** Saves the keys of the recording row, and takes them from other commands. */
  function saveRecorded(
    recording: Recording,
    key: ShortcutKeyText,
    action: SaveAction,
  ): void {
    const { command, replaces } = recording
    const keys = recordedKeys(keysOf(command), key, replaces)
    void save(saveOf(keyboard, replaceShortcutKeys(command, keys, keymap)), {
      action,
      command,
      done: { command, at: keys.indexOf(key) },
      failure: { kind: 'not-saved', command, key },
      back: { command, at: placeOf(command, replaces) },
    })
  }

  function take(press: ShortcutPress): void {
    if (edit?.kind !== 'recording' || saving !== null) return
    const key = shortcutFromPress(press)
    if (key === null) return
    const { command } = edit
    if (isFixedShortcut(key, keyboard)) {
      setEdit({ ...edit, recorded: undefined, held: [], refused: key })
      return
    }
    if (keysOf(command).includes(key)) {
      // The command has the key already, so nothing changes.
      setEdit(null)
      setFocus({ command, at: placeOf(command, key) })
      return
    }
    const held = shortcutConflicts(command, [key], keymap)
    const recording = { ...edit, recorded: key, held, refused: undefined }
    setEdit(recording)
    if (held.length === 0) saveRecorded(recording, key, 'key')
  }

  function replace(): void {
    if (saving !== null || edit === null || edit.held.length === 0) return
    if (edit.kind === 'recording') {
      if (edit.recorded !== undefined) {
        saveRecorded(edit, edit.recorded, 'replace')
      }
      return
    }
    const { command } = edit
    const defaults = defaultShortcutKeys(command, keyboard)
    void save(
      saveOf(keyboard, replaceShortcutKeys(command, defaults, keymap)),
      {
        action: 'replace',
        command,
        done: { command, at: 0 },
        failure: { kind: 'not-reset', command },
        back: { command, at: 'reset' },
      },
    )
  }

  function remove(): void {
    if (saving !== null || edit?.kind !== 'recording') return
    const { command, replaces } = edit
    if (replaces === undefined || edit.held.length > 0) return
    const at = placeOf(command, replaces)
    const keys = removedKeys(keysOf(command), replaces)
    void save(saveOf(keyboard, [{ command, keys }]), {
      action: 'remove',
      command,
      done: { command, at },
      failure: { kind: 'not-removed', command, key: replaces },
      back: { command, at },
    })
  }

  function reset(command: ShortcutCommandId): void {
    if (saving !== null) return
    setFailed(null)
    const defaults = defaultShortcutKeys(command, keyboard)
    const held = shortcutConflicts(command, defaults, keymap)
    if (held.length > 0) {
      setEdit({ kind: 'reset', command, held })
      setFocus({ command, at: 'replace' })
      return
    }
    void save(
      { keyboard, changes: [{ command, keys: null }] },
      {
        action: 'reset',
        command,
        done: { command, at: 0 },
        failure: { kind: 'not-reset', command },
        back: { command, at: 'reset' },
      },
    )
  }

  return {
    edit,
    saving: saving !== null,
    busy: (action, command) =>
      saving?.action === action && saving.command === (command ?? null),
    failed,
    focus,
    record: (command, replaces) => {
      if (saving !== null) return
      setFailed(null)
      setEdit({ kind: 'recording', command, replaces, held: [] })
    },
    take,
    cancel: () => {
      if (edit === null || saving !== null) return
      const { command } = edit
      setEdit(null)
      setFocus(
        edit.kind === 'reset'
          ? { command, at: 'reset' }
          : { command, at: placeOf(command, edit.replaces) },
      )
    },
    stop: () => setEdit(null),
    remove,
    replace,
    reset,
    resetAll: async () => {
      if (saving !== null) return false
      setEdit(null)
      return save(resetAllOf(keyboard, changes), {
        action: 'reset-all',
        command: null,
        done: null,
        failure: { kind: 'not-reset-all' },
        back: null,
      })
    },
    focusSearch: () => setFocus('search'),
    focused: () => setFocus(null),
  }
}

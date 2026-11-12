import { Plus } from 'lucide-react'
import styles from '../../../../docs/mockups/src/components/settings/ShortcutsSections.module.css'
import { defaultShortcutKeys } from '../../../app/shortcuts/defaults'
import type { ShortcutKeyText } from '../../../shared/shortcut-key'
import { SHORTCUT_KEYS_LIMIT } from '../../../shared/shortcuts'
import { ActionButton, IconButton } from '../../ui/actions'
import {
  CancelButton,
  keep,
  keyButton,
  ReplaceButton,
  type RowProps,
} from './RowButtons'
import { ConflictLines, EditMessage, FailedLine } from './RowMessages'
import type { Recording, ResetQuestion } from './shortcut-edit'
import { HeldKey, Keys, Recorder, RowLayout, spokenKey } from './ShortcutParts'
import { keptBy } from './tab-rows'

/**
 * A row whose recorder waits for a key: in the place of the pressed key,
 * with Remove beside Cancel, or after the keys. While other commands hold
 * the recorded key, the row names them and offers only Replace and Cancel.
 */
export function RecordingRow(
  props: RowProps & {
    edit: Recording
    /** The label of the one fixed row of the tab that holds a key. */
    fixedLabel: (key: ShortcutKeyText) => string | undefined
  },
) {
  const { command, keys, keyboard, editor, edit } = props
  const messageId = `shortcut-${command.id}-message`
  const recorder = (
    <Recorder
      cancel={editor.cancel}
      describedBy={messageId}
      key="recorder"
      keyboard={keyboard}
      label={command.label}
      recorded={edit.recorded}
      take={editor.take}
    />
  )
  const shown = keys.map((key, at) =>
    key === edit.replaces ? recorder : keyButton(props, key, at),
  )
  // Remove takes off the replaced key, but not while the row names the
  // commands that hold the recorded key.
  const removable = edit.held.length === 0 ? edit.replaces : undefined
  return (
    <RowLayout
      end={
        <>
          {edit.held.length > 0 ? <ReplaceButton {...props} /> : null}
          {removable !== undefined ? (
            <ActionButton
              accessibilityLabel={`Remove ${spokenKey(removable, keyboard)} from ${command.label}`}
              busy={editor.busy('remove', command.id)}
              disabled={editor.saving}
              onPress={editor.remove}
              tone="plain"
            >
              Remove
            </ActionButton>
          ) : null}
          <CancelButton editor={editor} />
        </>
      }
      keys={edit.replaces === undefined ? [...shown, recorder] : shown}
      label={command.label}
      message={
        <EditMessage
          edit={edit}
          fixedLabel={props.fixedLabel}
          id={messageId}
          keyboard={keyboard}
        />
      }
    />
  )
}

/**
 * A Reset whose default keys other commands hold: the defaults, with each
 * held key in the field of the recorder, and the lines that name the
 * commands that hold them, with Replace and Cancel.
 */
export function ResetRow(props: RowProps & { edit: ResetQuestion }) {
  const { command, keyboard, edit } = props
  return (
    <RowLayout
      end={
        <>
          <ReplaceButton {...props} />
          <CancelButton editor={props.editor} />
        </>
      }
      keys={defaultShortcutKeys(command.id, keyboard).map((key) =>
        edit.held.some((held) => held.key === key) ? (
          <HeldKey key={key} keyboard={keyboard} shortcut={key} />
        ) : (
          <span className={styles.still} key={key}>
            <Keys
              dimmed={keptBy(key, keyboard, props.host) !== undefined}
              keyboard={keyboard}
              shortcut={key}
            />
          </span>
        ),
      )}
      label={command.label}
      message={<ConflictLines held={edit.held} keyboard={keyboard} />}
    />
  )
}

/**
 * A row that shows its keys, + while it holds fewer than four, Add shortcut
 * without a key, Reset after a change, and the error of a failed save.
 */
export function KeysRow(props: RowProps & { changed: boolean }) {
  const { command, keys, editor } = props
  const { id, label } = command
  const count = keys.length
  return (
    <RowLayout
      end={
        count > 0 && count < SHORTCUT_KEYS_LIMIT ? (
          <IconButton
            buttonRef={keep(props.controls, 'add')}
            disabled={editor.saving}
            icon={Plus}
            label={`Add shortcut for ${label}`}
            onPress={() => editor.record(id)}
            quiet
          />
        ) : undefined
      }
      keys={
        count === 0 ? (
          <ActionButton
            accessibilityLabel={`Add shortcut for ${label}`}
            buttonRef={keep(props.controls, 'add')}
            disabled={editor.saving}
            icon={Plus}
            onPress={() => editor.record(id)}
            tone="plain"
          >
            Add shortcut
          </ActionButton>
        ) : (
          keys.map((key, at) => keyButton(props, key, at))
        )
      }
      label={label}
      message={
        <FailedLine
          failed={editor.failed}
          id={id}
          keyboard={props.keyboard}
          label={label}
        />
      }
      note={
        props.changed ? (
          <ActionButton
            accessibilityLabel={`Reset ${label}`}
            buttonRef={keep(props.controls, 'reset')}
            busy={editor.busy('reset', id)}
            disabled={editor.saving}
            onPress={() => editor.reset(id)}
            tone="plain"
          >
            Reset
          </ActionButton>
        ) : undefined
      }
    />
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Search } from 'lucide-react'
import { useControlSizes } from '../../../../docs/mockups/src/components/common/touch'
import { NoResults } from '../../../../docs/mockups/src/components/palette/PaletteEmpty'
import { Section } from '../../../../docs/mockups/src/components/settings/Section'
import styles from '../../../../docs/mockups/src/components/settings/ShortcutsSections.module.css'
import { useServices } from '../../../app/services'
import { useStore } from '../../../app/store'
import type { ShortcutKeyText } from '../../../shared/shortcut-key'
import { useApp } from '../../context'
import { useShortcutKeymap } from '../../shortcuts/shortcut-context'
import { CommandRow, FixedRow } from './CommandRow'
import { ShortcutIntro } from './ShortcutIntro'
import { fixedKeyLabel, matchingGroups, shortcutGroups } from './tab-rows'
import { useShortcutEditor } from './use-shortcut-editor'

/**
 * The Keyboard shortcuts tab of the account. It lists each command with
 * its keys on the keyboard of the device, with the changes of the person,
 * in the groups of Conductor, and the fixed keys. The search field keeps
 * the rows whose label or words hold each word of the query, as the
 * palette finds its rows. A press on a key, on +, or on Add shortcut
 * records the next key, and each change saves at once through the account.
 * In a normal browser tab, a key that does not work there is dimmed.
 */
export function ShortcutsTab() {
  const app = useApp()
  const account = useStore(app.account.account)
  const { platform: keyboard, host } = useServices()
  const keymap = useShortcutKeymap()
  const changes = account?.shortcuts[keyboard]
  const editor = useShortcutEditor(keyboard, keymap, changes ?? [])
  const { field } = useControlSizes()
  const [query, setQuery] = useState('')
  const groups = useMemo(() => shortcutGroups(keyboard, host), [keyboard, host])
  const fixedLabel = useCallback(
    (key: ShortcutKeyText) => fixedKeyLabel(key, keyboard),
    [keyboard],
  )
  const search = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (editor.focus !== 'search') return
    search.current?.focus()
    editor.focused()
  }, [editor])
  if (!account || changes === undefined) return null
  const changed = new Set(changes.map((change) => change.command))
  const shown = matchingGroups(query, groups)
  return (
    <>
      <InputFrame
        accessibilityLabel="Search shortcuts"
        inputRef={(element: unknown) => {
          search.current = element instanceof HTMLElement ? element : null
        }}
        onChangeText={(text) => {
          setQuery(text)
          editor.stop()
        }}
        placeholder="Search shortcuts"
        prefixIcon={Search}
        size={field}
        value={query}
      />
      <ShortcutIntro
        changed={changes.length}
        editor={editor}
        host={host}
        keyboard={keyboard}
      />
      {shown.length === 0 ? (
        <NoResults
          hint="Try a command name, such as Close tab."
          query={query.trim()}
        />
      ) : null}
      {shown.map((group) => (
        <Section
          description={group.description}
          key={group.label}
          title={group.label}
        >
          <ul aria-label={group.label} className={styles.list}>
            {group.rows.map((row) =>
              row.kind === 'command' ? (
                <CommandRow
                  changed={changed.has(row.command.id)}
                  command={row.command}
                  editor={editor}
                  fixedLabel={fixedLabel}
                  host={host}
                  key={row.command.id}
                  keyboard={keyboard}
                  keys={keymap.get(row.command.id) ?? []}
                />
              ) : (
                <FixedRow
                  key={row.label}
                  keyboard={keyboard}
                  keys={row.keys}
                  label={row.label}
                  note={!group.fixed}
                />
              ),
            )}
          </ul>
        </Section>
      ))}
    </>
  )
}

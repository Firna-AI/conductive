import { useEffect, useRef, useState } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import rowMenu from '../../../docs/mockups/src/components/workspaces/RowMenu.module.css'
import type { RowRename } from './row-menu'

/**
 * The field of Rename, in place of the name and the time of a row. It opens
 * with the name selected, or empty for a workspace without a name. Enter,
 * or a move of the focus out of the field, saves the trimmed name once.
 * Escape closes the field. An empty or unchanged name closes it with no
 * request. After a failed save, the field keeps the typed name, and Enter
 * or a move of the focus saves it again.
 */
export function WorkspaceNameField(props: {
  name: string | null
  page: boolean
  rename: RowRename
}) {
  const [draft, setDraft] = useState(props.name ?? '')
  const [saving, setSaving] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  // Enter and the blur that follows both finish the field: only the first
  // counts, until a save fails.
  const finished = useRef(false)
  // The field takes the focus after the cleanups of the closed menu. A sheet
  // of a phone makes the page inert until its cleanup, so a focus before it
  // would not take.
  useEffect(() => {
    field.current?.focus()
    field.current?.select()
  }, [])
  const finish = () => {
    if (finished.current) return
    finished.current = true
    const name = draft.trim()
    if (name === '' || name === props.name) {
      props.rename.cancel()
      return
    }
    setSaving(true)
    void props.rename.save(name).then((saved) => {
      if (saved) return
      finished.current = false
      setSaving(false)
    })
  }
  return (
    <input
      aria-busy={saving || undefined}
      aria-label="Workspace name"
      className={classes(rowMenu.field, props.page && rowMenu.fieldPage)}
      onBlur={finish}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        // While an input method composes a word, Enter and Escape belong to
        // the input method.
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Enter') {
          event.preventDefault()
          finish()
        } else if (event.key === 'Escape' && !finished.current) {
          event.preventDefault()
          finished.current = true
          props.rename.cancel()
        }
      }}
      readOnly={saving}
      ref={field}
      type="text"
      value={draft}
    />
  )
}

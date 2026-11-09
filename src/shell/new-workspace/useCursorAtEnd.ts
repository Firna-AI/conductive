import { useLayoutEffect, useRef, type Ref, type RefObject } from 'react'
import type { InputFrameProps } from '@firna/ui/input'

/** The handle of the text field of an `InputFrame`, which `inputRef` gets. */
type FieldHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/**
 * The handle of a message field whose cursor starts at the end of its
 * text, such as a kept draft that shows again. Give it to the `inputRef`
 * of the field. It moves the cursor once, as the field mounts, to the end
 * of the text of that first render. Later renders, clicks, keys, and the
 * focus leave the cursor where the user puts it, so an edit in the middle
 * of the text keeps its place.
 */
export function useCursorAtEnd(text: string): RefObject<FieldHandle | null> {
  const field = useRef<FieldHandle>(null)
  const end = useRef(text.length)
  useLayoutEffect(() => {
    field.current?.setSelection(end.current, end.current)
  }, [])
  return field
}

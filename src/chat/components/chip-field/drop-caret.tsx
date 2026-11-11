import { useImperativeHandle, useRef, useState, type Ref } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import caretStyles from '../../../../docs/mockups/src/components/chat/DraftText.module.css'
import { classes } from '../../../../docs/mockups/src/components/common/classes'
import local from './chip-field.module.css'
import { caretBoxAt, type CaretBox, type FieldPoint } from './point-caret'

/** Shows and hides the drop caret of a field, as its handle asks. */
export interface DropCaretControl {
  show(point: FieldPoint): void
  clear(): void
}

function sameBox(a: CaretBox | null, b: CaretBox | null): boolean {
  if (a === null || b === null) return a === b
  return a.left === b.left && a.top === b.top && a.height === b.height
}

/**
 * The drop caret of a field: while files hover over its text, a caret at the
 * place under the pointer, 2 px wide, as high as a line, in the accent
 * colour, as the mockups draw it. It stands over the text and takes no
 * pointer, so the place under the pointer stays that of the text. The
 * selection of the field does not change while it shows.
 */
export function DropCaretLayer(props: { control: Ref<DropCaretControl> }) {
  const [editor] = useLexicalComposerContext()
  const layer = useRef<HTMLSpanElement>(null)
  const [box, setBox] = useState<CaretBox | null>(null)
  useImperativeHandle(
    props.control,
    () => {
      const place = (next: CaretBox | null) =>
        setBox((now) => (sameBox(now, next) ? now : next))
      return {
        show: (point) => {
          const frame = layer.current?.getBoundingClientRect()
          const at = frame ? caretBoxAt(editor, point) : null
          if (!frame || !at) return place(null)
          const { left, top, height } = at
          place({ left: left - frame.left, top: top - frame.top, height })
        },
        clear: () => place(null),
      }
    },
    [editor],
  )
  return (
    <span aria-hidden className={local.dropLayer} ref={layer}>
      {box ? (
        <span
          className={classes(caretStyles.caret, local.dropCaret)}
          data-drop-caret=""
          style={{ left: box.left, top: box.top, height: box.height }}
        />
      ) : null}
    </span>
  )
}

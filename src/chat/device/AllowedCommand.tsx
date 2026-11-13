import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { ActionButton } from '../ui/actions'
import { LiteralText } from './LiteralText'
import local from './device.module.css'

/**
 * Whether the text of `node` is taller than its box while it is short.
 * While the text shows in full, the last answer stays, so Show less stays.
 * A change of the width measures again, because the text then wraps again.
 */
function useClipped(node: RefObject<HTMLElement | null>, open: boolean) {
  const [clipped, setClipped] = useState(false)
  useLayoutEffect(() => {
    const element = node.current
    if (!element || open) return
    const measure = () => {
      setClipped(element.scrollHeight > element.clientHeight + 1)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [node, open])
  return clipped
}

/**
 * One always-allowed command, by its exact text. A long command shows its
 * first lines, and its last line fades out. Show all shows the whole
 * command, and Show less makes it short again. A command that fits shows
 * no button. The whole text stays in the page, so a screen reader and a
 * copy get all of it.
 */
export function AllowedCommand(props: { command: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const clipped = useClipped(box, open)
  let className = local.command
  if (!open) className += ` ${local.short}`
  if (!open && clipped) className += ` ${local.faded}`
  return (
    <div className={local.allowed}>
      <div className={className} ref={box}>
        <LiteralText className={local.literal} text={props.command} />
      </div>
      {clipped ? (
        <span className={local.more}>
          <ActionButton
            expanded={open}
            onPress={() => setOpen(!open)}
            tone="plain"
          >
            {open ? 'Show less' : 'Show all'}
          </ActionButton>
        </span>
      ) : null}
    </div>
  )
}

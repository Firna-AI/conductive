import { useRef, useState } from 'react'
import { ActionButton } from '../ui/actions'
import { LiteralText } from './LiteralText'
import local from './device.module.css'
import { useClipped } from './use-clipped'

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
  const clipped = useClipped(box, open, props.command)
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

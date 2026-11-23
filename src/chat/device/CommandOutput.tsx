import { useRef, useState } from 'react'
import card from '../../ui/components/chat/MacCommand.module.css'
import { ActionButton } from '../ui/actions'
import { useClipped } from './use-clipped'

/**
 * The output of a command that ran on the Mac, in its tinted block. Long
 * output shows its first ten lines, and its last lines fade out. Show all
 * shows the whole output, and Show less makes it short again. Output that
 * fits shows no button. The whole text stays in the page, so a screen
 * reader, a search of the page, and a copy get all of it.
 */
export function CommandOutput(props: { text: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLPreElement>(null)
  const clipped = useClipped(box, open, props.text)
  let className = card.outputText
  if (!open) className += ` ${card.outputShort}`
  if (!open && clipped) className += ` ${card.outputFaded}`
  return (
    <div className={card.output}>
      <pre className={className} ref={box}>
        {props.text}
      </pre>
      {clipped ? (
        <span className={card.outputMore}>
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

import type { KeyboardEvent, ReactNode, RefObject } from 'react'

/**
 * The dialog of the palette: on desktop a card, and on a phone a page. A
 * press on a part without a control gives the focus to the dialog, which
 * gives it on to the search field, so the typing goes on there.
 */
export function PaletteSurface({
  ref,
  ...props
}: {
  ref: RefObject<HTMLElement | null>
  className: string
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  focusField: () => void
  children: ReactNode
}) {
  return (
    <section
      aria-label="Search"
      aria-modal
      className={props.className}
      onFocus={(event) => {
        if (event.target === event.currentTarget) props.focusField()
      }}
      onKeyDownCapture={props.onKeyDown}
      ref={ref}
      role="dialog"
      tabIndex={-1}
    >
      {props.children}
    </section>
  )
}

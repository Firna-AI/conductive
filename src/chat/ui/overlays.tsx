import { useRef, type ReactNode } from 'react'
import { useModalLayer } from '../../shell/ui/layers'
import sheetStyles from '../../../docs/mockups/src/components/common/Sheet.module.css'
import styles from '../../../docs/mockups/src/components/common/ConfirmDialog.module.css'
import { useEscape, useFocusInside, useFocusTrap } from './dismiss'

type FirstFocus = (node: HTMLElement) => HTMLElement | null

const firstButton: FirstFocus = (node) => node.querySelector('button')
const keepFocus: FirstFocus = () => null

/**
 * A sheet that rises from the bottom of a phone screen over a dimmed page.
 * A press on the dimmed page or Escape closes it, and Tab stays inside it.
 * It covers the nearest positioned frame: the phone screen of the app.
 * `focus` picks the control that takes the focus; a menu in the sheet
 * moves the focus itself.
 */
export function Sheet(props: {
  title: string
  children: ReactNode
  onClose: () => void
  focus?: FirstFocus
}) {
  const ref = useRef<HTMLElement>(null)
  useEscape(props.onClose)
  useFocusTrap(ref)
  useFocusInside(ref, props.focus ?? keepFocus)
  useModalLayer()
  return (
    <div className={sheetStyles.layer}>
      <div aria-hidden className={sheetStyles.scrim} onClick={props.onClose} />
      <section
        aria-label={props.title}
        aria-modal
        className={sheetStyles.sheet}
        ref={ref}
        role="dialog"
      >
        <span aria-hidden className={sheetStyles.handle} />
        <h2 className={sheetStyles.title}>{props.title}</h2>
        <div className={sheetStyles.body}>{props.children}</div>
      </section>
    </div>
  )
}

function DesktopDialog(props: {
  title: string
  children: ReactNode
  actions: ReactNode
  onCancel: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  useEscape(props.onCancel)
  useFocusTrap(ref)
  useFocusInside(ref, firstButton)
  useModalLayer()
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} onClick={props.onCancel} />
      <section
        aria-label={props.title}
        aria-modal
        className={styles.dialog}
        ref={ref}
        role="dialog"
      >
        <h2 className={styles.title}>{props.title}</h2>
        {props.children}
        <div className={styles.actions}>{props.actions}</div>
      </section>
    </div>
  )
}

/**
 * A question that the user confirms before an action: a dialog over the
 * dimmed app on desktop, and a sheet on a phone. The actions come last, with
 * the confirming action at the end. The focus starts on the first action,
 * the safe one, Tab stays inside, and Escape cancels.
 */
export function ConfirmDialog(props: {
  title: string
  mobile: boolean
  children: ReactNode
  actions: ReactNode
  onCancel: () => void
}) {
  if (!props.mobile) {
    return (
      <DesktopDialog
        actions={props.actions}
        onCancel={props.onCancel}
        title={props.title}
      >
        {props.children}
      </DesktopDialog>
    )
  }
  return (
    <Sheet focus={firstButton} onClose={props.onCancel} title={props.title}>
      <div className={styles.sheetBody}>
        {props.children}
        <div className={styles.sheetActions}>{props.actions}</div>
      </div>
    </Sheet>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}

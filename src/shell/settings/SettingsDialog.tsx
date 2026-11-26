import { createContext, useContext, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from '../../ui/components/settings/SettingsDialog.module.css'
import { IconButton } from '../ui/actions'
import { useEscapeLayer } from '../ui/escape-layer'
import { Overlay, useLayerFocus } from '../ui/Overlay'
import { trapTab } from '../ui/Sheet'
import { SettingsNav } from './SettingsNav'
import type { SettingsGroup } from './settings-tabs'

const SettingsSlot = createContext<ReactNode>(null)

/**
 * Gives the Settings dialog to the desktop frame of the page below it,
 * which shows it in its layer of dialogs.
 */
export function SettingsSlotProvider(props: {
  dialog: ReactNode
  children: ReactNode
}) {
  return (
    <SettingsSlot.Provider value={props.dialog}>
      {props.children}
    </SettingsSlot.Provider>
  )
}

/** The Settings dialog of the address, in the layers of a desktop frame. */
export function SettingsLayer() {
  return useContext(SettingsSlot)
}

/**
 * Settings on a desktop: a dialog over the whole frame, with the list of
 * the tabs on its left and the open tab on its right. Close, Esc, and a
 * press on the dim around it run `close`. A press in a dialog that a tab
 * opens, such as Delete org, does not close it, because that dialog lies
 * outside this one. The dialog stays open while the person moves between
 * its tabs, so the focus stays in it.
 */
export function SettingsDialog(props: DialogProps) {
  return (
    <Overlay>
      <DialogLayer {...props} />
    </Overlay>
  )
}

interface DialogProps {
  groups: readonly SettingsGroup[]
  title: string
  group: string
  close: () => void
  children: ReactNode
}

/**
 * The dialog in the layer of the frame. It takes the focus as it mounts,
 * which is after the layer of a frame that mounts with it.
 */
function DialogLayer(props: DialogProps) {
  const dialog = useRef<HTMLElement>(null)
  const title = useId()
  // The row of the open tab takes the focus as the dialog opens.
  const openRow = useRef<HTMLAnchorElement>(null)
  useEscapeLayer(true, props.close)
  useLayerFocus(dialog, { modal: true, moved: () => true, initial: openRow })
  return (
    <div className={styles.layer}>
      <div
        aria-hidden
        className={styles.scrim}
        onPointerDown={(event) => {
          event.preventDefault()
          props.close()
        }}
      />
      <section
        aria-label="Settings"
        aria-modal
        className={styles.dialog}
        onKeyDownCapture={trapTab}
        ref={dialog}
        role="dialog"
        tabIndex={-1}
      >
        <div className={styles.side}>
          <div className={styles.heading}>Settings</div>
          <SettingsNav
            groups={props.groups}
            openRow={openRow}
            variant="panel"
          />
        </div>
        <div className={styles.main}>
          <header className={styles.bar}>
            <div className={styles.titles}>
              <h1 className={styles.title} id={title}>
                {props.title}
              </h1>
              <span className={styles.group}>{props.group}</span>
            </div>
            <IconButton icon={X} label="Close" onPress={props.close} />
          </header>
          <div aria-labelledby={title} className={styles.body} role="region">
            <div className={styles.column}>{props.children}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

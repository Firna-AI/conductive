import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useHref, useNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { useApp } from '../context'
import { isPlainClick, useGo } from '../ui/AppLink'
import { useViewport } from '../ui/viewport'
import { NewWorkspaceDialog } from './NewWorkspaceDialog'

/** Where a new workspace goes: an org, and a section of it or General. */
export interface WorkspacePlace {
  orgId: string
  /** `null` puts the workspace in General, the default section. */
  sectionId: string | null
}

/** The New workspace dialog of a desktop frame. */
interface DialogLayer {
  open(place: WorkspacePlace): void
  /** A New workspace form shows on the screen, until the result runs. */
  showForm(): () => void
  /** Whether the screen shows a New workspace form now. */
  formShown(): boolean
}

const DialogContext = createContext<DialogLayer | null>(null)

/**
 * The New workspace dialog of a desktop frame, over the whole frame. Each
 * place of New workspace opens it through `useNewWorkspace`. The dialog has
 * no address: it shows over the address where it opened, and it closes when
 * the address changes, also while its create runs. A close keeps the draft,
 * which belongs to the org and the section.
 */
export function NewWorkspaceHost(props: { children: ReactNode }) {
  const navigation = useNavigation()
  const href = useHref()
  const [open, setOpen] = useState<(WorkspacePlace & { href: string }) | null>(
    null,
  )
  const forms = useRef(0)
  // A new address closes the dialog in the same render.
  if (open !== null && open.href !== href) setOpen(null)
  const dialog = useMemo<DialogLayer>(
    () => ({
      open: (place) => setOpen({ ...place, href: navigation.href() }),
      showForm: () => {
        forms.current += 1
        let shown = true
        return () => {
          if (!shown) return
          shown = false
          forms.current -= 1
        }
      },
      formShown: () => forms.current > 0,
    }),
    [navigation],
  )
  return (
    <DialogContext.Provider value={dialog}>
      {props.children}
      {open !== null && open.href === href ? (
        <NewWorkspaceDialog
          close={() => setOpen(null)}
          orgId={open.orgId}
          sectionId={open.sectionId}
        />
      ) : null}
    </DialogContext.Provider>
  )
}

/**
 * Marks a screen that shows a New workspace form: the page, or the form
 * that a failed start gives back. While it shows, New workspace opens the
 * page, because a dialog over it would show a second message field.
 */
export function useShownForm(): void {
  const dialog = useContext(DialogContext)
  useEffect(() => dialog?.showForm(), [dialog])
}

/**
 * The one way to open New workspace, for each of its places: the row at
 * the top of the list, the button of an org without workspaces, and the
 * item in the menu of a section. On a computer, with the dialog chosen, it
 * opens the dialog over the current screen. It opens the page on a phone,
 * without that choice, while the account loads, and while the screen shows
 * a New workspace form.
 */
export function useNewWorkspace() {
  const dialog = useContext(DialogContext)
  const app = useApp()
  const go = useGo()
  const phone = useViewport() === 'phone'
  /** The dialog layer, when New workspace opens as a dialog now. */
  const asDialog = (): DialogLayer | null => {
    if (dialog === null || phone || dialog.formShown()) return null
    const view = app.account.account.get()?.newWorkspaceView
    return view === 'dialog' ? dialog : null
  }
  return {
    /** Opens New workspace as the dialog or as the page. */
    open: (place: WorkspacePlace) => {
      const layer = asDialog()
      if (layer) layer.open(place)
      else go(routes.newWorkspace(place.orgId, place.sectionId ?? undefined))
    },
    /**
     * The click of a link to the page. A plain click opens the dialog in
     * place of the page when the dialog applies. Any other click stays a
     * click of a link, so Cmd or Ctrl opens the page in a new tab.
     */
    click: (event: MouseEvent, place: WorkspacePlace) => {
      const layer = isPlainClick(event) ? asDialog() : null
      if (!layer) return
      event.preventDefault()
      layer.open(place)
    },
  }
}

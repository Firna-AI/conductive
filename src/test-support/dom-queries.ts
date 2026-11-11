// Finds elements in a DOM test as a person or a screen reader finds them:
// by their role and their accessible name, by their `aria-label`, or by
// their text. The finders skip what is not shown and aria-hidden content.

const implicitRoles: Readonly<Record<string, string>> = {
  A: 'link',
  ASIDE: 'complementary',
  BUTTON: 'button',
  DIALOG: 'dialog',
  INPUT: 'textbox',
  SECTION: 'region',
  TEXTAREA: 'textbox',
  UL: 'list',
}

/**
 * Whether the element is shown: `checkVisibility()` is true, and no
 * ancestor has `hidden`. happy-dom does not hide the content of an element
 * with `hidden`, so the second check is needed.
 */
export function isShown(element: Element): boolean {
  return element.checkVisibility() && element.closest('[hidden]') === null
}

/** Why a person cannot use the element now, or null when they can. */
export function whyInoperable(element: Element): string | null {
  if (!isShown(element)) return 'it is not shown'
  if (element.closest('[inert]') !== null) return 'it is inert'
  const dialogs = Array.from(element.ownerDocument.querySelectorAll('dialog'))
  const open = dialogs.filter((dialog) => dialog.open)
  if (open.length > 0 && !open.some((dialog) => dialog.contains(element))) {
    return 'it is outside the open dialog'
  }
  return null
}

/**
 * Whether a person can use the element now: it is shown, it is not inert,
 * and it is inside the open dialog whenever a dialog is open.
 * @public The DOM test support API exposes this predicate.
 */
export function isOperable(element: Element): boolean {
  return whyInoperable(element) === null
}

/** Whether a finder returns the element. */
function findable(element: Element): boolean {
  return isShown(element) && element.closest('[aria-hidden="true"]') === null
}

/** The text that a screen reader reads, without parts that are aria-hidden. */
function spokenText(node: Node): string {
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') {
    return ''
  }
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  return Array.from(node.childNodes, spokenText).join('')
}

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** The accessible name: `aria-label`, `aria-labelledby`, or the spoken text. */
export function accessibleName(element: Element): string {
  const label = element.getAttribute('aria-label')
  const labelledBy = element.getAttribute('aria-labelledby')
  const name =
    label ??
    (labelledBy
      ? labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
      : spokenText(element))
  return tidy(name)
}

/** The one element of the list, or null. More than one fails. */
function single(found: HTMLElement[], what: string): HTMLElement | null {
  if (found.length > 1) throw new Error(`${found.length} elements ${what}`)
  return found.at(0) ?? null
}

/** The element, or a failure that says what is missing. */
function present(element: HTMLElement | null, what: string): HTMLElement {
  if (!element) throw new Error(`No element ${what}`)
  return element
}

/** Every shown element with the role and exactly the accessible name. */
export function queryAllByRole(
  role: string,
  name: string,
  root: ParentNode = document,
): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
    (element) =>
      (element.getAttribute('role') ?? implicitRoles[element.tagName]) ===
        role &&
      accessibleName(element) === name &&
      findable(element),
  )
}

/** The one shown element with the role and the name, or null. More than one fails. */
export function queryByRole(
  role: string,
  name: string,
  root: ParentNode = document,
): HTMLElement | null {
  const what = `have role ${role} and name "${name}"`
  return single(queryAllByRole(role, name, root), what)
}

/** The one shown element with the role and the name. None or more than one fails. */
export function byRole(
  role: string,
  name: string,
  root: ParentNode = document,
): HTMLElement {
  const what = `has role ${role} and name "${name}"`
  return present(queryByRole(role, name, root), what)
}

/** The one shown element with exactly this `aria-label`, or null. More than one fails. */
export function queryByLabel(
  label: string,
  root: ParentNode = document,
): HTMLElement | null {
  const found = Array.from(
    root.querySelectorAll<HTMLElement>('[aria-label]'),
  ).filter(
    (element) =>
      element.getAttribute('aria-label') === label && findable(element),
  )
  return single(found, `have the label "${label}"`)
}

/** The one shown element with exactly this `aria-label`, whatever its role. */
export function byLabel(
  label: string,
  root: ParentNode = document,
): HTMLElement {
  return present(queryByLabel(label, root), `has the label "${label}"`)
}

/**
 * Every shown element whose spoken text is exactly `text`, and inside which
 * no smaller element has it.
 */
export function queryAllByText(
  text: string,
  root: ParentNode = document,
): HTMLElement[] {
  const holds = (element: Element) => tidy(spokenText(element)) === text
  return Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
    (element) =>
      holds(element) &&
      !Array.from(element.children).some(holds) &&
      findable(element),
  )
}

/**
 * The one shown element whose spoken text is exactly `text`, and inside
 * which no smaller element has it, or null. More than one fails.
 */
export function queryByText(
  text: string,
  root: ParentNode = document,
): HTMLElement | null {
  return single(queryAllByText(text, root), `have the text "${text}"`)
}

/** The one shown element with exactly this text. None or more than one fails. */
export function byText(text: string, root: ParentNode = document): HTMLElement {
  return present(queryByText(text, root), `has the text "${text}"`)
}

/**
 * The element with the focus, by its role and its accessible name, such as
 * `button Connect Claude`. An element without a role gives its tag, and
 * `the page` means that the focus fell to the page.
 */
export function focusedElement(): string {
  const active = document.activeElement
  if (active === null || active === document.body) return 'the page'
  const role =
    active.getAttribute('role') ??
    implicitRoles[active.tagName] ??
    active.tagName.toLowerCase()
  return `${role} ${accessibleName(active)}`
}

/** The one shown `<dialog>` with the name. None or more than one fails. */
export function byDialog(
  name: string,
  root: ParentNode = document,
): HTMLDialogElement {
  const element = byRole('dialog', name, root)
  if (!(element instanceof HTMLDialogElement)) {
    throw new Error(`The dialog "${name}" is not a <dialog> element`)
  }
  return element
}

/** The toasts of the app that show, in their order. */
export function shownToasts(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="region"][aria-label="Notifications"] :is([role="alert"], [role="status"])',
    ),
  )
}

/** The one toast whose text starts with the title. None or more than one fails. */
export function byToast(title: string): HTMLElement {
  const found = shownToasts().filter((toast) =>
    (toast.textContent ?? '').startsWith(title),
  )
  const what = `is a toast with the title "${title}"`
  return present(single(found, what), what)
}

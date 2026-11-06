// Finds elements in a DOM test as a person or a screen reader finds them:
// by their role and their accessible name, or by their `aria-label`.

const implicitRoles: Readonly<Record<string, string>> = {
  BUTTON: 'button',
  DIALOG: 'dialog',
  INPUT: 'textbox',
  SECTION: 'region',
  TEXTAREA: 'textbox',
  UL: 'list',
}

/** The text that a screen reader reads, without parts that are aria-hidden. */
function spokenText(node: Node): string {
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') {
    return ''
  }
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  return Array.from(node.childNodes, spokenText).join('')
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
  return name.replace(/\s+/g, ' ').trim()
}

/** Every element with the role and exactly the accessible name. */
export function queryAllByRole(
  role: string,
  name: string,
  root: ParentNode = document,
): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
    (element) =>
      (element.getAttribute('role') ?? implicitRoles[element.tagName]) ===
        role && accessibleName(element) === name,
  )
}

/** The one element with the role and the name, or null. More than one fails. */
export function queryByRole(
  role: string,
  name: string,
  root: ParentNode = document,
): HTMLElement | null {
  const found = queryAllByRole(role, name, root)
  if (found.length > 1) {
    throw new Error(
      `${found.length} elements have role ${role} and name "${name}"`,
    )
  }
  return found.at(0) ?? null
}

/** The one element with the role and the name. None or more than one fails. */
export function byRole(
  role: string,
  name: string,
  root: ParentNode = document,
): HTMLElement {
  const element = queryByRole(role, name, root)
  if (!element)
    throw new Error(`No element has role ${role} and name "${name}"`)
  return element
}

/** The one element with exactly this `aria-label`, or null. More than one fails. */
export function queryByLabel(
  label: string,
  root: ParentNode = document,
): HTMLElement | null {
  const found = Array.from(
    root.querySelectorAll<HTMLElement>('[aria-label]'),
  ).filter((element) => element.getAttribute('aria-label') === label)
  if (found.length > 1) {
    throw new Error(`${found.length} elements have the label "${label}"`)
  }
  return found.at(0) ?? null
}

/** The one element with exactly this `aria-label`, whatever its role. */
export function byLabel(
  label: string,
  root: ParentNode = document,
): HTMLElement {
  const element = queryByLabel(label, root)
  if (!element) throw new Error(`No element has the label "${label}"`)
  return element
}

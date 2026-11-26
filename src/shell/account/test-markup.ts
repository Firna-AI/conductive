import { textOf } from '../test-render'

export interface RenderedButton {
  /** The spoken name: the accessibility label, or else the visible text. */
  label: string
  disabled: boolean
}

/** Each button of rendered HTML, in its order, with its name and state. */
export function buttonsOf(html: string): RenderedButton[] {
  return [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(
    ([, attributes, content]) => ({
      label: /aria-label="([^"]*)"/.exec(attributes)?.[1] ?? textOf(content),
      disabled: attributes.includes('disabled=""'),
    }),
  )
}

/**
 * The section of a mounted tab with this title, such as New workspaces,
 * for a control whose name another section of the tab also has.
 */
export function sectionTitled(root: ParentNode, title: string): HTMLElement {
  const section = Array.from(root.querySelectorAll('section')).find(
    (item) => item.querySelector('h2')?.textContent === title,
  )
  if (!section) throw new Error(`No section is titled ${title}.`)
  return section
}

/** The HTML of each item of the list with this accessibility label. */
export function listItems(html: string, label: string): string[] {
  const list = new RegExp(`<ul aria-label="${label}"[^>]*>([\\s\\S]*?)</ul>`)
  const content = list.exec(html)?.[1] ?? ''
  return [...content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(
    ([, item]) => item,
  )
}

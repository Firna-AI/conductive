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

/** The HTML of each item of the list with this accessibility label. */
export function listItems(html: string, label: string): string[] {
  const list = new RegExp(`<ul aria-label="${label}"[^>]*>([\\s\\S]*?)</ul>`)
  const content = list.exec(html)?.[1] ?? ''
  return [...content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(
    ([, item]) => item,
  )
}

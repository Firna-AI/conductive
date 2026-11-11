import { textOf } from './render-kit'

/** The rendered chat as a page that a DOM test can read. */
export function pageOf(markup: string): HTMLElement {
  const page = document.createElement('div')
  page.innerHTML = markup
  return page
}

/**
 * The text of an element, with each tag as a space and no space at the ends.
 * The page writes a no-break space as `&nbsp;`, so it reads as a space too.
 */
export const textIn = (element: Element | null) =>
  textOf((element?.innerHTML ?? '').replaceAll('&nbsp;', ' ')).trim()

/** The folds of the chat, without the message lines inside a work fold. */
export function topFolds(markup: string): HTMLDetailsElement[] {
  return Array.from(pageOf(markup).querySelectorAll('details')).filter(
    (fold) => fold.parentElement?.closest('details') === null,
  )
}

/** Each fold of the chat: the words of its line, and the text of each step. */
export function folds(markup: string) {
  return topFolds(markup).map((fold) => ({
    line: textIn(fold.querySelector(':scope > summary')),
    steps: Array.from(fold.querySelectorAll(':scope > ul > li'), textIn),
  }))
}

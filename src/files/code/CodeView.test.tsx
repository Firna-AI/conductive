import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { CodeView } from './CodeView'
import styles from './code.module.css'

function lines(html: string): string[] {
  return html.split(`<div class="${styles.line}">`).slice(1)
}

it('numbers each line and colours keywords, strings, comments, numbers, and types', () => {
  const html = renderToStaticMarkup(
    <CodeView
      name="useLimit.ts"
      text={"const limit: Limit = 3 // at least\nreturn 'three'\n"}
    />,
  )
  const [first, second, third] = lines(html)
  expect(third).toBeUndefined()
  expect(first).toContain(`<span class="${styles.number}">1</span>`)
  expect(first).toContain(`<span class="${styles.keyword}">const</span>`)
  expect(first).toContain(`<span class="${styles.type}">Limit</span>`)
  expect(first).toContain(`<span class="${styles['number-token']}">3</span>`)
  expect(first).toContain(`<span class="${styles.comment}">// at least</span>`)
  expect(second).toContain(`<span class="${styles.number}">2</span>`)
  expect(second).toContain(
    `<span class="${styles.string}">&#x27;three&#x27;</span>`,
  )
})

it('keeps a block comment open across lines, and shows unknown files without colours', () => {
  const code = renderToStaticMarkup(
    <CodeView name="a.css" text={'/* one\ntwo */ a { color: red }'} />,
  )
  expect(lines(code)[1]).toContain(
    `<span class="${styles.comment}">two */</span>`,
  )
  // Names of members of plain objects are unknown files too.
  for (const name of ['LICENSE', 'constructor', 'notes.constructor']) {
    let plain = ''
    expect(() => {
      plain = renderToStaticMarkup(
        <CodeView name={name} text="const MIT = 1" />,
      )
    }, name).not.toThrow()
    expect(lines(plain)[0], name).toContain('<span>const MIT = 1</span>')
  }
})

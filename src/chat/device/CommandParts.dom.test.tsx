// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { CommandLine } from './CommandParts'

it('colours a multiline shell command while keeping its exact text and hidden character marks', () => {
  const command =
    'export PATH="/bin" # path\nif true; then\n\tprintf "a\u00A0b"\nfi\n'
  document.body.innerHTML = renderToStaticMarkup(
    <CommandLine command={command} />,
  )
  const code = document.querySelector('code')
  expect(code?.textContent).toBe(`$ ${command}`)
  const coloured = (kind: string) =>
    Array.from(code?.querySelectorAll<HTMLElement>('span') ?? [])
      .filter((span) => span.style.color === `var(--ui-code-${kind})`)
      .map((span) => span.textContent)
  expect(coloured('keyword')).toEqual(['export', 'if', 'then', 'fi'])
  expect(coloured('string')).toEqual(['"/bin"', '"a\u00A0b"'])
  expect(coloured('comment')).toEqual(['# path\n'])
  expect(
    Array.from(code?.querySelectorAll('[data-literal-code]') ?? [], (mark) =>
      mark.getAttribute('data-literal-code'),
    ),
  ).toEqual(['U+000A', 'U+000A', 'U+00A0', 'U+000A', 'U+000A'])
})

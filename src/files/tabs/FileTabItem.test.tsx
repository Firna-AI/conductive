import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { testNavigation } from '../files-test-kit'
import { FileTabItem } from './FileTabItem'

const path = 'scripts/seed-acme-7f3k.sql'
const label = 'scripts/seed-[redacted].sql'

/** The attributes and the text that a person reads, without the address. */
function shown(html: string): string {
  return html.replace(/ href="[^"]*"/g, '')
}

it('names a tab by the label of its path, links it to the real path, and offers Close', () => {
  const named = renderToStaticMarkup(
    <FileTabItem
      label={label}
      navigation={testNavigation()}
      onClose={() => {}}
      selected
      tab={{ kind: 'diff', path }}
    />,
  )
  const unknown = renderToStaticMarkup(
    <FileTabItem
      label={null}
      navigation={testNavigation()}
      onClose={() => {}}
      selected={false}
      tab={{ kind: 'file', path, mode: 'source' }}
    />,
  )
  expect({
    named: {
      href: /href="([^"]*)"/.exec(named)?.[1],
      title: /title="([^"]*)"/.exec(named)?.[1],
      names: [...named.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]),
      leaks: shown(named).includes('acme-7f3k'),
    },
    unknown: {
      href: /href="([^"]*)"/.exec(unknown)?.[1],
      title: /title="([^"]*)"/.exec(unknown)?.[1],
      names: [...unknown.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]),
      text: unknown.replace(/<[^>]+>/g, ''),
      leaks: shown(unknown).includes('acme-7f3k'),
    },
  }).toEqual({
    named: {
      href: `/diff/${path}`,
      title: label,
      names: [
        'seed-[redacted].sql changes',
        'Close seed-[redacted].sql changes',
      ],
      leaks: false,
    },
    unknown: {
      href: `/file/source/${path}`,
      title: undefined,
      names: ['Close File'],
      text: 'File',
      leaks: false,
    },
  })
})

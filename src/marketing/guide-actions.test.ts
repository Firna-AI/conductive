import { satteri } from '@astrojs/markdown-satteri'
import { Window } from 'happy-dom'
import { expect, it } from 'vitest'

import { guideActions } from './guide-actions'

it('marks tight and loose standalone guide links but leaves mixed content inline', async () => {
  const renderer = await satteri({
    hastPlugins: [guideActions],
  }).createRenderer({ syntaxHighlight: 'prism' })
  const { code } = await renderer.render(`
- [Tight action](/tight)
- Read [tight inline](/tight-inline) next.

A separate list follows.

- [Loose action](/loose)

- Read [loose inline](/loose-inline) next.
`)
  const window = new Window()
  try {
    const document = new window.DOMParser().parseFromString(code, 'text/html')
    expect(
      [...document.querySelectorAll('li a')].map((link) => ({
        href: link.getAttribute('href'),
        action: link.classList.contains('guide-action'),
      })),
    ).toEqual([
      { href: '/tight', action: true },
      { href: '/tight-inline', action: false },
      { href: '/loose', action: true },
      { href: '/loose-inline', action: false },
    ])
  } finally {
    await window.happyDOM.close()
  }
})

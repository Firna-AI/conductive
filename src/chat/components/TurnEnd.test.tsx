// @vitest-environment happy-dom

import { expect, it, vi } from 'vitest'
import { accessibleName } from '../../test-support/dom-queries'
import { mount, MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import { TurnEnd } from './TurnEnd'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

it('names each changed file of a turn by its label, and opens the diff of its real path', async () => {
  const opened: string[] = []
  const view = await mount(
    <TurnEnd
      durationMs={1_000}
      files={[
        {
          path: 'scripts/seed-acme-7f3k.sql',
          displayPath: 'scripts/seed-[redacted].sql',
          change: 'added',
          added: 6,
          removed: 0,
        },
        { path: 'README.md', change: 'modified', added: 1, removed: 0 },
      ]}
      filesUnavailable={false}
      omittedFiles={0}
      onOpenDiff={(path) => opened.push(path)}
    />,
  )
  const chips = [...view.container.querySelectorAll('button')]
  for (const chip of chips) await press(chip)
  expect({
    names: chips.map(accessibleName),
    leaks: view.container.innerHTML.includes('acme-7f3k'),
    opened,
  }).toEqual({
    names: [
      'Open the changes of scripts/seed-[redacted].sql',
      'Open the changes of README.md',
    ],
    leaks: false,
    opened: ['scripts/seed-acme-7f3k.sql', 'README.md'],
  })
})

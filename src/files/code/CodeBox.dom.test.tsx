// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { DiffView } from '../diff/DiffView'
import { CodeView } from './CodeView'
import { mountBox, press, selectAll } from './code-box-test-kit'

const selected = { stopped: true, inBox: true, outside: false }

describe('CodeBox select all', () => {
  it('selects only the code of a file, with Cmd+A or Ctrl+A', async () => {
    const { box, outside } = await mountBox(
      <CodeView name="a.ts" text={'one\ntwo'} />,
    )
    expect({
      meta: selectAll(box, outside, { metaKey: true }),
      ctrl: selectAll(box, outside, { ctrlKey: true }),
      tabIndex: box.getAttribute('tabindex'),
    }).toEqual({ meta: selected, ctrl: selected, tabIndex: '0' })
  })

  it('selects only the diff, with Cmd+A', async () => {
    const { box, outside } = await mountBox(
      <DiffView
        name="a.ts"
        newContent={null}
        oldContent={null}
        rows={[{ kind: 'added', text: 'one', oldLine: null, newLine: 1 }]}
      />,
    )
    expect({
      meta: selectAll(box, outside, { metaKey: true }),
      tabIndex: box.getAttribute('tabindex'),
    }).toEqual({ meta: selected, tabIndex: '0' })
  })

  it('leaves other keys to the browser', async () => {
    const { box } = await mountBox(<CodeView name="a.ts" text="one" />)
    expect([
      press(box, { key: 'a' }),
      press(box, { key: 'c', metaKey: true }),
      press(box, { key: 'a', metaKey: true, shiftKey: true }),
    ]).toEqual([false, false, false])
  })
})

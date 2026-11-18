// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import type { HtmlPageView } from './html-preview'
import {
  htmlFile,
  mountedReport,
  pageFrame,
  reportPath,
  reportSource,
  seen,
  serverWithReport,
  standInShell,
} from './html-test-kit'

describe('the page of an HTML file', () => {
  it('shows the error of a read that finds no file in place of the page, and keeps the page after a read over the limit', async () => {
    const missing = await mountedReport(
      serverWithReport(
        {
          error: { code: 'file_not_found', message: 'The file is not there.' },
        },
        404,
      ),
    )
    const tooLarge = await mountedReport(
      serverWithReport(
        {
          error: {
            code: 'file_too_large',
            message: 'The file is too large to open.',
            sizeBytes: 6_000_000,
            limitBytes: 5_242_880,
          },
        },
        413,
      ),
    )
    const shell = standInShell()
    for (const each of [missing, tooLarge]) {
      each.render(shell.preview({ kind: 'page', frame: pageFrame }))
      await each.release()
    }

    expect({
      missing: {
        ...seen(missing.view.container),
        text: missing.view.container.textContent,
      },
      tooLarge: seen(tooLarge.view.container),
      calls: shell.calls,
    }).toEqual({
      missing: {
        frame: false,
        checked: ['Preview'],
        buttons: [],
        links: [],
        rows: 0,
        text: expect.stringContaining('This file moved or was deleted'),
      },
      tooLarge: {
        frame: true,
        checked: ['Preview'],
        buttons: ['Reload'],
        links: [],
        rows: 0,
      },
      // The page shows while the read runs, until the missing file ends it.
      calls: ['show', 'stop', 'show'],
    })
  })

  it('keeps only its header for a frame under the page, keeps a page that shows while the sandbox does not run, and else shows the state of the sandbox', async () => {
    const { view, render, release } = await mountedReport(
      serverWithReport(htmlFile(reportPath, reportSource)),
    )
    const { calls, preview } = standInShell()
    render(preview({ kind: 'page', frame: null }))
    await release()
    const below = view.container.querySelector('section')?.children.length
    const waiting = <p>Waiting for the sandbox</p>
    const keeps = (each: HtmlPageView) => {
      render(preview(each), { placeholder: waiting })
      return {
        frame: seen(view.container).frame,
        waits: view.container.textContent?.includes('Waiting for the sandbox'),
      }
    }

    expect({
      below,
      page: keeps({ kind: 'page', frame: pageFrame }),
      opening: keeps({ kind: 'opening' }),
      calls,
    }).toEqual({
      below: 1,
      page: { frame: true, waits: false },
      opening: { frame: false, waits: true },
      // The kept page goes on with its show, and the state of the sandbox
      // ends it.
      calls: ['show', 'stop'],
    })
  })
})

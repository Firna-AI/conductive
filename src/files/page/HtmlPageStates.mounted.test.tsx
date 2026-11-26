// @vitest-environment happy-dom

import { useLayoutEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
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

const { org, workspace: id } = FAKE_IDS

/** The name of the page and the label of its path in the header. */
function named(container: HTMLElement) {
  return {
    name: container.querySelector('section')?.getAttribute('aria-label'),
    label: container.querySelector('span[title]')?.getAttribute('title'),
  }
}

/**
 * Stands in for the kept frame of the shell, which draws nothing in place:
 * it records each mount and each end.
 */
function KeptMark(props: { marks: string[] }) {
  const { marks } = props
  useLayoutEffect(() => {
    marks.push('kept')
    return () => {
      marks.push('ended')
    }
  }, [marks])
  return null
}

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
      each.render(
        shell.preview({ kind: 'page', frame: pageFrame, kept: false }),
      )
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

  it('keeps the label of the last read of an HTML file that no list names at a return and after a read over the limit, and shows its page only while that label hides no secret value', async () => {
    // No list names these files, so only a read gives each label.
    const files: Record<string, { path: string; displayPath?: string }> = {
      plain: { path: 'coverage/report.html' },
      hidden: {
        path: 'coverage/acme-7f3k.html',
        displayPath: 'coverage/[redacted].html',
      },
    }
    const shown: Record<string, unknown> = {}
    for (const [kind, { path, displayPath }] of Object.entries(files)) {
      const server = new FakeApiServer()
      const content = filePaths.content(org, id, path)
      server.json('GET', content, {
        ...htmlFile(path, reportSource),
        displayPath,
      })
      const { view, render, release } = await mountedReport(server, path)
      const { calls, preview } = standInShell()
      const page = preview({ kind: 'page', frame: pageFrame, kept: false })
      render(page)
      const beforeRead = named(view.container)
      await release()
      // The file grows past the read limit while another tab shows. The
      // shell keys each page by its path, so the return mounts a new page,
      // which renders before its read answers.
      server.json(
        'GET',
        content,
        {
          error: {
            code: 'file_too_large',
            message: 'The file is too large to open.',
            sizeBytes: 6_000_000,
            limitBytes: 5_242_880,
          },
        },
        413,
      )
      view.render(null)
      render(page)
      const atReturn = { ...seen(view.container), ...named(view.container) }
      await release()
      shown[kind] = {
        beforeRead,
        atReturn,
        afterRead: { ...seen(view.container), ...named(view.container) },
        calls,
      }
    }

    const unknown = { name: 'File', label: undefined }
    const plain = { name: 'report.html', label: 'coverage/report.html' }
    const hidden = {
      name: '[redacted].html',
      label: 'coverage/[redacted].html',
    }
    const withPage = {
      frame: true,
      checked: ['Preview'],
      buttons: ['Reload'],
      links: [],
      rows: 0,
    }
    const noPage = {
      frame: false,
      checked: [],
      buttons: [],
      links: [],
      rows: 0,
    }
    expect(shown).toEqual({
      plain: {
        beforeRead: unknown,
        atReturn: { ...withPage, ...plain },
        afterRead: { ...withPage, ...plain },
        // The return shows the page at once, and the read over the limit
        // keeps it.
        calls: ['show', 'stop', 'show'],
      },
      hidden: {
        beforeRead: unknown,
        atReturn: { ...noPage, ...hidden },
        afterRead: { ...noPage, ...hidden },
        calls: [],
      },
    })
  })

  it('renders a kept frame only while it shows the page, with only its header, keeps a page that shows while the sandbox does not run, and else shows the state of the sandbox', async () => {
    const { view, render, release } = await mountedReport(
      serverWithReport(htmlFile(reportPath, reportSource)),
    )
    const { calls, preview } = standInShell()
    const marks: string[] = []
    const kept: HtmlPageView = {
      kind: 'page',
      frame: <KeptMark marks={marks} />,
      kept: true,
    }
    render(preview(kept))
    await release()
    const shown = {
      parts: view.container.querySelector('section')?.children.length,
      marks: [...marks],
    }
    render(preview(kept), { mode: 'source' })
    const source = [...marks]
    const waiting = <p>Waiting for the sandbox</p>
    const keeps = (each: HtmlPageView) => {
      render(preview(each), { placeholder: waiting })
      return {
        frame: seen(view.container).frame,
        waits: view.container.textContent?.includes('Waiting for the sandbox'),
      }
    }

    expect({
      shown,
      source,
      page: keeps({ kind: 'page', frame: pageFrame, kept: false }),
      opening: keeps({ kind: 'opening' }),
      calls,
    }).toEqual({
      shown: { parts: 1, marks: ['kept'] },
      source: ['kept', 'ended'],
      page: { frame: true, waits: false },
      opening: { frame: false, waits: true },
      // Source ends the first show. The kept page goes on with its show, and
      // the state of the sandbox ends it.
      calls: ['show', 'stop', 'show', 'stop'],
    })
  })
})

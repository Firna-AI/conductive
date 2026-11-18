// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { testNavigation } from '../files-test-kit'
import { heldFetch, mountRoot, press, startedFiles } from '../mount-test-kit'
import { FilePage } from './FilePage'
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

describe('the tab of an HTML file', () => {
  it('starts in Preview with the page in its frame, Reload, and Open, and Source shows the text with line numbers and ends the show', async () => {
    const { view, navigation, render, release } = await mountedReport(
      serverWithReport(htmlFile(reportPath, reportSource)),
    )
    const { calls, preview } = standInShell()
    const open = <a href="https://launch.test/?path=report">Open</a>
    render(preview({ kind: 'page', frame: pageFrame }, open))
    await release()
    const inPreview = { ...seen(view.container), calls: [...calls] }

    press(view.container, 'radio', 'Source')
    render(preview({ kind: 'page', frame: pageFrame }, open), {
      mode: 'source',
    })

    expect({
      inPreview,
      visited: navigation.visited,
      inSource: { ...seen(view.container), calls },
    }).toEqual({
      inPreview: {
        frame: true,
        checked: ['Preview'],
        buttons: ['Download report.html', 'Reload'],
        links: ['Open'],
        rows: 0,
        calls: ['show'],
      },
      visited: [{ kind: 'file', path: reportPath, mode: 'source' }],
      inSource: {
        frame: false,
        checked: ['Source'],
        buttons: ['Download report.html'],
        links: [],
        rows: 2,
        calls: ['show', 'stop'],
      },
    })
  })

  it('shows its source with no switch and never shows the page while its label hides a secret value', async () => {
    const secret = 'reports/acme-7f3k.html'
    const server = new FakeApiServer()
    server.json('GET', filePaths.content(org, id, secret), {
      ...htmlFile(secret, reportSource),
      displayPath: 'reports/[redacted].html',
    })
    const held = heldFetch(server)
    const files = await startedFiles(server, held)
    const { calls, preview } = standInShell()
    const view = mountRoot()
    view.render(
      <FilePage
        files={files}
        htmlPreview={preview({ kind: 'page', frame: pageFrame })}
        layout="desktop"
        navigation={testNavigation()}
        tab={{ kind: 'file', path: secret, mode: 'preview' }}
      />,
    )
    const beforeRead = seen(view.container)
    await act(async () => {
      await held.release()
    })

    expect({ beforeRead, afterRead: seen(view.container), calls }).toEqual({
      beforeRead: {
        frame: false,
        checked: [],
        buttons: [],
        links: [],
        rows: 0,
      },
      afterRead: {
        frame: false,
        checked: [],
        buttons: ['Download [redacted].html'],
        links: [],
        rows: 2,
      },
      calls: [],
    })
  })

  it('shows only the source of a dot file, which the files preview does not serve', async () => {
    const dotFile = '.draft.html'
    const server = new FakeApiServer()
    server.json(
      'GET',
      filePaths.content(org, id, dotFile),
      htmlFile(dotFile, reportSource),
    )
    const held = heldFetch(server)
    const files = await startedFiles(server, held)
    const { calls, preview } = standInShell()
    const view = mountRoot()
    view.render(
      <FilePage
        files={files}
        htmlPreview={preview({ kind: 'page', frame: pageFrame })}
        layout="desktop"
        navigation={testNavigation()}
        tab={{ kind: 'file', path: dotFile, mode: 'preview' }}
      />,
    )
    await act(async () => {
      await held.release()
    })

    expect({ afterRead: seen(view.container), calls }).toEqual({
      afterRead: {
        frame: false,
        checked: [],
        buttons: ['Download .draft.html'],
        links: [],
        rows: 2,
      },
      calls: [],
    })
  })

  it('shows the look of the launch page with Reload while the preview opens, and a failure or the notice of older software with no Reload or Open', async () => {
    const { view, render, release } = await mountedReport(
      serverWithReport(htmlFile(reportPath, reportSource)),
    )
    const { calls, preview } = standInShell()
    const views: Record<string, HtmlPageView> = {
      opening: { kind: 'opening' },
      failed: {
        kind: 'failed',
        message: 'The cloud computer did not answer. Try again.',
      },
      'older-software': { kind: 'older-software' },
    }
    const shown: Record<string, unknown> = {}
    for (const [name, each] of Object.entries(views)) {
      render(preview(each))
      await release()
      const { buttons, links, frame } = seen(view.container)
      shown[name] = {
        text: view.container
          .querySelector('section > div:last-child')
          ?.textContent?.trim(),
        buttons,
        links,
        frame,
      }
    }
    render(preview(views.failed))
    press(view.container, 'button', 'Try again')

    expect({ shown, calls }).toEqual({
      shown: {
        opening: {
          text: 'Opening preview',
          buttons: ['Download report.html', 'Reload'],
          links: [],
          frame: false,
        },
        failed: {
          text: "The preview couldn't openThe cloud computer did not answer. Try again.Try again",
          buttons: ['Download report.html', 'Try again'],
          links: [],
          frame: false,
        },
        'older-software': {
          text: 'Restart to preview this fileThe preview needs newer cloud computer software. Select Restart in the workspace header.',
          buttons: ['Download report.html'],
          links: [],
          frame: false,
        },
      },
      calls: ['show', 'reload'],
    })
  })
})

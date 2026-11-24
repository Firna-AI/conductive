// @vitest-environment happy-dom

import { act } from 'react'
import { expect, it } from 'vitest'
import type { DiffResponse } from '../../shared/generated/DiffResponse'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { accessibleName } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { testNavigation } from '../files-test-kit'
import { heldFetch, mountRoot, press, startedFiles } from '../mount-test-kit'
import { DiffPage } from './DiffPage'

// The facts of a diff page that do not come from its lines: the link of a
// binary diff to its file tab, the deletion of its file, and the changed
// lines of its header, also for a path that Changes leaves out.

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

/** The names of the controls on screen that start a download. */
function downloadControls(container: HTMLElement): string[] {
  return [...container.querySelectorAll('button, a')]
    .map((element) => accessibleName(element))
    .filter((name) => name.startsWith('Download'))
}

function titles(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h2')].map((h2) => h2.textContent ?? '')
}

it('links a binary diff to its file tab in place of Download', async () => {
  const server = new FakeApiServer()
  const path = 'public/hero.png'
  const diff: DiffResponse = {
    path,
    baseBranch: 'main',
    oldContent: null,
    newContent: null,
    binary: true,
    patch: '',
  }
  server.json('GET', filePaths.diff(org, id, path), diff)
  const held = heldFetch(server)
  const files = await startedFiles(server, held)
  const navigation = testNavigation()
  const view = mountRoot()
  view.render(
    <DiffPage
      files={files}
      layout="desktop"
      navigation={navigation}
      tab={{ kind: 'diff', path }}
    />,
  )
  await act(async () => {
    await held.release()
  })
  expect(titles(view.container)).toEqual(['This binary file changed'])
  expect(downloadControls(view.container)).toEqual([])

  press(view.container, 'link', 'Open the file')

  expect(navigation.visited).toEqual([
    { kind: 'file', path: 'public/hero.png', mode: 'preview' },
  ])
})

it('reads the deletion of a binary file that Changes leaves out from its patch, so only a file that exists keeps its link', async () => {
  const server = new FakeApiServer()
  const deleted = 'public/old-logo.png'
  const linked = 'public/logo.png'
  const binary = (path: string, patch: string, newContent: string | null) =>
    server.json('GET', filePaths.diff(org, id, path), {
      path,
      baseBranch: 'main',
      oldContent: null,
      newContent,
      binary: true,
      patch,
    } satisfies DiffResponse)
  const removal = (path: string) =>
    `diff --git a/${path} b/${path}\ndeleted file mode 100644\nindex 3b18e51..0000000\nGIT binary patch\nliteral 0\nHcmV?d00001\n`
  binary(deleted, removal(deleted), null)
  // A change of type removes the old entry and adds a link at the path.
  const link = `diff --git a/${linked} b/${linked}\nnew file mode 120000\nindex 0000000..8e7b3c1\n--- /dev/null\n+++ b/${linked}\n@@ -0,0 +1 @@\n+assets/logo.png\n`
  binary(linked, `${removal(linked)}${link}`, 'assets/logo.png')
  const held = heldFetch(server)
  const files = await startedFiles(server, held)
  const shown: Record<string, unknown> = {}
  for (const path of [deleted, linked]) {
    const view = mountRoot()
    view.render(
      <DiffPage
        files={files}
        layout="desktop"
        navigation={testNavigation()}
        tab={{ kind: 'diff', path }}
      />,
    )
    await act(async () => {
      await held.release()
    })
    const links = [...view.container.querySelectorAll('a')].map(accessibleName)
    shown[path] = {
      titles: titles(view.container),
      links: links.filter((name) => name === 'Open the file'),
    }
    view.unmount()
  }
  expect(shown).toEqual({
    [deleted]: { titles: ['This binary file changed'], links: [] },
    [linked]: {
      titles: ['This binary file changed'],
      links: ['Open the file'],
    },
  })
})

it('counts the changed lines of a text diff that Changes leaves out from its own rows', async () => {
  const server = new FakeApiServer()
  const path = 'tests/fixtures/addresses/zz/9999.json'
  server.json('GET', filePaths.diff(org, id, path), {
    path,
    baseBranch: 'main',
    oldContent: '{\n  "city": "Wien"\n}\n',
    newContent: '{\n  "city": "Graz",\n  "zip": "8010"\n}\n',
    binary: false,
    patch: `diff --git a/${path} b/${path}\nindex 1c2d3e4..5f6a7b8 100644\n--- a/${path}\n+++ b/${path}\n@@ -1,3 +1,4 @@\n {\n-  "city": "Wien"\n+  "city": "Graz",\n+  "zip": "8010"\n }\n`,
  } satisfies DiffResponse)
  const held = heldFetch(server)
  const files = await startedFiles(server, held)
  const view = mountRoot()
  view.render(
    <DiffPage
      files={files}
      layout="desktop"
      navigation={testNavigation()}
      tab={{ kind: 'diff', path }}
    />,
  )
  await act(async () => {
    await held.release()
  })
  const stat = view.container.querySelector(
    '[role="img"][aria-label$="removed"]',
  )
  expect(stat && accessibleName(stat)).toBe('2 lines added, 1 removed')
})

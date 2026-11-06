import { autocompleteHook } from '../../../docs/mockups/src/fixtures/fileContents'
import {
  filePaths,
  type DiffResponse,
  type FileEntry,
  type FileResponse,
} from '../../shared/files'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { splitPath } from '../navigation'
import * as samples from './dev-samples'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

/** The text of each development file, by path. Development only. */
export const devTextFiles: Readonly<Record<string, string>> = {
  'README.md': samples.readme,
  'docs/README.md': samples.readme,
  'src/app/checkout/useAddressAutocomplete.ts': `${autocompleteHook}\n`,
  'src/app/checkout/AddressForm.tsx': `${samples.addressForm}\n`,
  'src/app/layout.tsx': samples.layout,
  'tests/checkout/address.test.ts': samples.addressTest,
  'next.config.ts': samples.nextConfig,
  'package.json': samples.packageJson,
  'tsconfig.json': samples.tsconfig,
  '.env.example': samples.envExample,
  'notes.txt': samples.notes,
}

/** A 1 × 1 PNG, so the page shows its binary state. */
const pixel =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function download(server: FakeApiServer, path: string, body: BodyInit) {
  server.response(
    'GET',
    filePaths.download(org, id, path),
    new Response(body, {
      headers: {
        'Content-Disposition': `attachment; filename="${splitPath(path).name}"`,
      },
    }),
  )
}

/** Sets the reply of one text file and of its download. */
export function registerText(
  server: FakeApiServer,
  path: string,
  text: string,
) {
  const file: FileResponse = {
    path,
    mediaType: 'text/plain',
    encoding: 'utf-8',
    content: text,
    sizeBytes: new TextEncoder().encode(text).byteLength,
  }
  server.json('GET', filePaths.content(org, id, path), file)
  download(server, path, text)
}

export function registerDiff(server: FakeApiServer, diff: DiffResponse) {
  server.json('GET', filePaths.diff(org, id, diff.path), diff)
}

function diffOf(
  path: string,
  before: string | null,
  after: string | null,
): DiffResponse {
  const patch =
    before === null
      ? samples.addedPatch(after ?? '')
      : samples.deletedPatch(before)
  return {
    path,
    baseBranch: 'main',
    oldContent: before,
    newContent: after,
    patch,
    binary: false,
  }
}

const readmePatch = `@@ -12,3 +12,6 @@ ## Checkout
-Checkout suggests addresses as you type.
+Checkout suggests addresses as you type. Suggestions come from \`/api/places\`, which needs \`PLACES_API_KEY\`. Without the key, the form falls back to manual entry.
+
+## Tests
+`

const extraEntries: readonly FileEntry[] = [
  { path: 'public/hero.png', name: 'hero.png', kind: 'file', change: null },
  {
    path: 'public/catalog.json',
    name: 'catalog.json',
    kind: 'file',
    change: null,
  },
]

/**
 * Sets the development replies of the file routes on the fake server:
 * file texts, downloads, diffs, a binary file, a file over the read limit,
 * and a read that fails. The limit is a sample, not product policy.
 */
export function registerDevFiles(server: FakeApiServer): void {
  const tree = toolFixtures().files
  server.json('GET', filePaths.tree(org, id), {
    revision: tree.revision,
    entries: [...tree.entries, ...extraEntries],
  })
  for (const [path, text] of Object.entries(devTextFiles)) {
    registerText(server, path, text)
  }
  server.json('GET', filePaths.content(org, id, 'public/hero.png'), {
    path: 'public/hero.png',
    mediaType: 'image/png',
    encoding: 'base64',
    content: pixel,
    sizeBytes: 70,
  })
  download(
    server,
    'public/hero.png',
    Uint8Array.from(atob(pixel), (char) => char.charCodeAt(0)),
  )
  server.json(
    'GET',
    filePaths.content(org, id, 'public/catalog.json'),
    {
      error: {
        code: 'file_too_large',
        message: 'The file is too large to open.',
        sizeBytes: 3_407_872,
        limitBytes: 1_048_576,
      },
    },
    413,
  )
  download(server, 'public/catalog.json', '{"products":[]}\n')
  server.json(
    'GET',
    filePaths.content(org, id, 'src/app/checkout/page.tsx'),
    {
      error: {
        code: 'file_unavailable',
        message: 'The file could not be read.',
      },
    },
    503,
  )
  const form = 'src/app/checkout/AddressForm.tsx'
  for (const diff of [
    {
      path: form,
      baseBranch: 'main',
      oldContent: samples.oldAddressForm,
      newContent: samples.addressForm,
      patch: samples.addressFormPatch,
      binary: false,
    },
    {
      ...diffOf('README.md', samples.readme, samples.readme),
      patch: readmePatch,
    },
    {
      ...diffOf('docs/README.md', samples.readme, samples.readme),
      patch: readmePatch,
    },
    diffOf(
      'src/app/checkout/useAddressAutocomplete.ts',
      null,
      autocompleteHook,
    ),
    diffOf('src/app/checkout/postcodeLookup.ts', samples.postcodeLookup, null),
    diffOf('tests/checkout/address.test.ts', null, samples.addressTest),
    diffOf('notes.txt', null, samples.notes),
    diffOf('.env.example', samples.envExample, null),
  ]) {
    registerDiff(server, diff)
  }
}

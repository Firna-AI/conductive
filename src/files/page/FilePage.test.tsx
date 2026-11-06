import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { filesFor, testNavigation } from '../files-test-kit'
import type { FilesLayout } from '../navigation'
import { DiffPage } from './DiffPage'
import { FilePage } from './FilePage'

const path = 'src/app/checkout/AddressForm.tsx'

function pages(layout: FilesLayout) {
  const files = filesFor(new FakeApiServer())
  const common = { files, layout, navigation: testNavigation() }
  return {
    file: renderToStaticMarkup(
      <FilePage {...common} tab={{ kind: 'file', path, mode: 'preview' }} />,
    ),
    diff: renderToStaticMarkup(
      <DiffPage {...common} tab={{ kind: 'diff', path }} />,
    ),
  }
}

it('links a phone page back to its list, and gives desktop pages no way back', () => {
  const phone = pages('phone')
  expect(phone.file).toMatch(
    /<a aria-label="Back to All files" class="[^"]*" href="\/list\/all">/,
  )
  expect(phone.diff).toMatch(
    /<a aria-label="Back to Changes" class="[^"]*" href="\/list\/changes">/,
  )
  const desktop = pages('desktop')
  expect(desktop.file).not.toContain('Back to')
  expect(desktop.diff).not.toContain('Back to')
})

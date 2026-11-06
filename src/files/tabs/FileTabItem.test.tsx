import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { testNavigation } from '../files-test-kit'
import { FileTabItem } from './FileTabItem'

it('links a tab to its own address, names a diff tab, and offers Close', () => {
  const html = renderToStaticMarkup(
    <FileTabItem
      navigation={testNavigation()}
      onClose={() => {}}
      selected
      tab={{ kind: 'diff', path: 'src/app/checkout/AddressForm.tsx' }}
    />,
  )
  expect(html).toMatch(
    /<a aria-current="page" aria-label="AddressForm.tsx changes" class="[^"]*" href="\/diff\/src\/app\/checkout\/AddressForm.tsx"/,
  )
  expect(html).toContain('aria-label="Close AddressForm.tsx changes"')
})

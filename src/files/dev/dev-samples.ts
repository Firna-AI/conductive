import { addressFormDiff } from '../../../docs/mockups/src/fixtures/fileContents'

/** Development samples. The README follows the mockup's rendered README. */
export const readme = `# Storefront

The Acme web shop, built with Next.js and Postgres.

> **Note:** the browser calls \`/api/places\`, *never* the places API, so \`PLACES_API_KEY\` stays on the server.

## Getting started

1. Copy \`.env.example\` to \`.env.local\`.
2. Run \`npm ci\`, then \`npm run dev\`.
3. Open \`http://localhost:3000\`.

## Environment

| Variable | Used for | Required |
| --- | --- | :---: |
| \`DATABASE_URL\` | Orders, carts, and sessions | Yes |
| \`PLACES_API_KEY\` | Address suggestions at checkout<br>Manual entry without it | No |
| ~~\`POSTCODE_API_KEY\`~~ | Removed with the postcode lookup | No |

## Checkout

Checkout suggests addresses as you type. Suggestions come from \`/api/places\`, which needs \`PLACES_API_KEY\`. Without the key, the form falls back to *manual entry*.

A form reads the suggestions with the hook:

\`\`\`ts
import { useAddressAutocomplete } from '@/app/checkout/useAddressAutocomplete'

// Lookups start at the third character.
const { suggestions, loading } = useAddressAutocomplete(line1)
\`\`\`

![Suggestions under the address field](https://design.acme.example/forms/address/suggestions.png)

- [x] Suggestions from the places API
- [x] Manual entry without the key
- [ ] Saved addresses for signed-in customers

---

## Tests

\`\`\`
npm test
\`\`\`

### End-to-end tests

\`\`\`
npx playwright test
\`\`\`
`

function sideOf(kind: 'added' | 'removed'): string {
  return addressFormDiff
    .flatMap((hunk) => hunk.lines)
    .filter((line) => line.kind === 'context' || line.kind === kind)
    .map((line) => line.text)
    .join('\n')
}

/** The new and the old side of the mockup's AddressForm.tsx diff. */
export const addressForm = sideOf('added')
export const oldAddressForm = sideOf('removed')

/** The mockup's AddressForm.tsx hunks as a unified patch. */
export const addressFormPatch = addressFormDiff
  .flatMap((hunk) => hunk.lines)
  .map((line) => {
    if (line.kind === 'hunk') return line.text
    const sign = { context: ' ', added: '+', removed: '-' }[line.kind]
    return `${sign}${line.text}`
  })
  .join('\n')

export const addressTest = `import { expect, test } from '@playwright/test'

test('suggests an address after three characters', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByLabel('Address').fill('221b Baker')
  await expect(page.getByRole('option').first()).toBeVisible()
})
`

export const postcodeLookup = `export async function lookupPostcode(postcode: string) {
  const response = await fetch(\`/api/postcodes/\${postcode}\`)
  return response.json()
}
`

export const layout = `export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  )
}
`

export const nextConfig = `import type { NextConfig } from 'next'

const config: NextConfig = { reactStrictMode: true }

export default config
`

export const packageJson = `{
  "name": "storefront",
  "version": "2.4.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "test": "vitest run"
  }
}
`

export const tsconfig = `{
  // The app and the tests share one configuration.
  "compilerOptions": { "strict": true, "jsx": "preserve" }
}
`

export const envExample = `# Copy to .env.local
PLACES_API_KEY=
`

export const notes = `Try the Places API key from the team vault.
Check the manual fallback on a slow network.
Ask design about the suggestion list.
`

/** Unified patches for a new file and a deleted file. */
export function addedPatch(text: string): string {
  const lines = text.replace(/\n$/, '').split('\n')
  return [
    `@@ -0,0 +1,${lines.length} @@`,
    ...lines.map((line) => `+${line}`),
  ].join('\n')
}

export function deletedPatch(text: string): string {
  const lines = text.replace(/\n$/, '').split('\n')
  return [
    `@@ -1,${lines.length} +0,0 @@`,
    ...lines.map((line) => `-${line}`),
  ].join('\n')
}

/**
 * The contents of the files that the previews show.
 */

import type { TableCells } from '../../../../src/markdown/table-rows'

export type MarkdownBlock =
  | { kind: 'h1' | 'h2' | 'p'; text: string }
  | { kind: 'ol' | 'ul'; items: readonly string[] }
  | { kind: 'code'; text: string }
  | ({ kind: 'table' } & TableCells<string>)

/** `README.md`, already split into blocks. Backticks mark inline code. */
export const readme: readonly MarkdownBlock[] = [
  { kind: 'h1', text: 'Storefront' },
  { kind: 'p', text: 'The Acme web shop, built with Next.js and Postgres.' },
  { kind: 'h2', text: 'Getting started' },
  {
    kind: 'ol',
    items: [
      'Copy `.env.example` to `.env.local`.',
      'Run `npm ci`, then `npm run dev`.',
      'Open `http://localhost:3000`.',
    ],
  },
  { kind: 'h2', text: 'Environment' },
  {
    kind: 'table',
    align: [null, null, 'center'],
    head: ['Variable', 'Used for', 'Required'],
    rows: [
      ['`DATABASE_URL`', 'Orders, carts, and sessions', 'Yes'],
      ['`PLACES_API_KEY`', 'Address suggestions at checkout', 'No'],
    ],
  },
  { kind: 'h2', text: 'Checkout' },
  {
    kind: 'p',
    text: 'Checkout suggests addresses as you type. Suggestions come from `/api/places`, which needs `PLACES_API_KEY`. Without the key, the form falls back to manual entry.',
  },
  { kind: 'h2', text: 'Tests' },
  { kind: 'code', text: 'npm test\nnpx playwright test' },
]

export const autocompleteHook = `import { useEffect, useState } from 'react'

export type AddressSuggestion = {
  id: string
  label: string
  line1: string
  city: string
  postcode: string
}

// Fewer characters match too many places to be useful.
const MIN_QUERY_LENGTH = 3

export function useAddressAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    setLoading(true)

    fetch(\`/api/places?q=\${encodeURIComponent(query)}\`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((body: { predictions: AddressSuggestion[] }) => {
        setSuggestions(body.predictions)
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [query])

  return { suggestions, loading }
}`

export type DiffLine =
  | { kind: 'hunk'; text: string }
  | { kind: 'context' | 'added' | 'removed'; text: string }

export type DiffHunkStart = { old: number; new: number }

/** Two hunks of the change to `AddressForm.tsx`. */
export const addressFormDiff: readonly {
  start: DiffHunkStart
  lines: readonly DiffLine[]
}[] = [
  {
    start: { old: 1, new: 1 },
    lines: [
      { kind: 'hunk', text: '@@ -1,6 +1,7 @@' },
      { kind: 'context', text: "'use client'" },
      { kind: 'context', text: '' },
      { kind: 'context', text: "import { useState } from 'react'" },
      {
        kind: 'added',
        text: "import { useAddressAutocomplete } from './useAddressAutocomplete'",
      },
      { kind: 'context', text: "import { Field } from '@/components/Field'" },
      { kind: 'context', text: '' },
    ],
  },
  {
    start: { old: 18, new: 19 },
    lines: [
      {
        kind: 'hunk',
        text: '@@ -18,9 +19,22 @@ export function AddressForm({ onSubmit })',
      },
      { kind: 'context', text: "  const [line1, setLine1] = useState('')" },
      { kind: 'context', text: "  const [city, setCity] = useState('')" },
      {
        kind: 'added',
        text: '  const { suggestions } = useAddressAutocomplete(line1)',
      },
      { kind: 'context', text: '' },
      { kind: 'context', text: '  return (' },
      { kind: 'context', text: '    <form onSubmit={submit}>' },
      {
        kind: 'removed',
        text: '      <Field label="Address" value={line1} onChange={setLine1} />',
      },
      { kind: 'added', text: '      <Field' },
      { kind: 'added', text: '        label="Address"' },
      { kind: 'added', text: '        value={line1}' },
      { kind: 'added', text: '        onChange={setLine1}' },
      { kind: 'added', text: '        autoComplete="off"' },
      { kind: 'added', text: '      />' },
      { kind: 'added', text: '      <Suggestions items={suggestions} />' },
      {
        kind: 'context',
        text: '      <Field label="City" value={city} onChange={setCity} />',
      },
    ],
  },
]

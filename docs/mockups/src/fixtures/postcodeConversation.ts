import type { ChatItem, ToolKind } from './conversations'
import type { ChangedFile } from './files'

function done(
  id: string,
  kind: ToolKind,
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool: kind, target, detail, status: 'done' }
}

/** The files of the turn. The cloud computer that held them is deleted. */
const postcodeFiles: readonly ChangedFile[] = [
  {
    path: 'src/app/checkout/postcodeLookup.ts',
    change: 'added',
    added: 48,
    removed: 0,
  },
  {
    path: 'src/app/checkout/AddressForm.tsx',
    change: 'modified',
    added: 21,
    removed: 3,
  },
  {
    path: 'tests/checkout/postcode.test.ts',
    change: 'added',
    added: 36,
    removed: 0,
  },
]

/**
 * The chat of Postcode lookup for the shipping and billing forms, `W-372`.
 * Its agent built the postcode lookup that Checkout address autocomplete
 * later replaced, with the test of a restored address that the answer of
 * the workspace links page names.
 */
export const postcodeHistory: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask',
    text: 'Add a postcode lookup to the shipping and billing forms. A restored address keeps its street and city.',
  },
  done('read-form', 'read', 'src/app/checkout/AddressForm.tsx'),
  done('create-lookup', 'create', 'src/app/checkout/postcodeLookup.ts', '+48'),
  done('edit-form', 'edit', 'src/app/checkout/AddressForm.tsx', '+21 −3'),
  done('create-test', 'create', 'tests/checkout/postcode.test.ts', '+36'),
  done('unit', 'run', 'npm test -- postcode', '6 passed'),
  {
    kind: 'agent',
    id: 'done',
    blocks: [
      'Done. A postcode now fills the street and the city of both forms. A restored address skips the lookup, and a test covers that case.',
    ],
  },
  {
    kind: 'turn-end',
    id: 'turn-end',
    duration: '2m 37s',
    files: postcodeFiles,
  },
]

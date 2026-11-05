/**
 * The files of the open workspace: the tree for "All", and the changes
 * against the default branch for "Changes".
 */

export type ChangeKind = 'added' | 'modified'

export type TreeEntry = {
  name: string
  /** Nesting depth from the repository root. */
  depth: number
  folder: boolean
  /** A folder whose children show below it. */
  open?: boolean
  change?: ChangeKind
  /** The preview that opens for this file, when the mockups draw one. */
  preview?: 'code' | 'markdown' | 'diff'
}

export const fileTree: readonly TreeEntry[] = [
  { name: '.github', depth: 0, folder: true },
  { name: 'prisma', depth: 0, folder: true },
  { name: 'public', depth: 0, folder: true },
  { name: 'src', depth: 0, folder: true, open: true },
  { name: 'app', depth: 1, folder: true, open: true },
  { name: 'api', depth: 2, folder: true },
  { name: 'checkout', depth: 2, folder: true, open: true },
  {
    name: 'AddressForm.tsx',
    depth: 3,
    folder: false,
    change: 'modified',
    preview: 'diff',
  },
  { name: 'page.tsx', depth: 3, folder: false },
  {
    name: 'useAddressAutocomplete.ts',
    depth: 3,
    folder: false,
    change: 'added',
    preview: 'code',
  },
  { name: 'layout.tsx', depth: 2, folder: false },
  { name: 'lib', depth: 1, folder: true },
  { name: 'tests', depth: 0, folder: true, open: true },
  { name: 'checkout', depth: 1, folder: true, open: true },
  { name: 'address.test.ts', depth: 2, folder: false, change: 'added' },
  { name: '.env.example', depth: 0, folder: false },
  { name: 'next.config.ts', depth: 0, folder: false },
  { name: 'package.json', depth: 0, folder: false },
  {
    name: 'README.md',
    depth: 0,
    folder: false,
    change: 'modified',
    preview: 'markdown',
  },
  { name: 'tsconfig.json', depth: 0, folder: false },
]

export type ChangedFile = {
  path: string
  change: ChangeKind
  added: number
  removed: number
  preview?: 'code' | 'markdown' | 'diff'
}

export const changedFiles: readonly ChangedFile[] = [
  {
    path: 'src/app/checkout/useAddressAutocomplete.ts',
    change: 'added',
    added: 64,
    removed: 0,
    preview: 'code',
  },
  {
    path: 'src/app/checkout/AddressForm.tsx',
    change: 'modified',
    added: 38,
    removed: 6,
    preview: 'diff',
  },
  {
    path: 'tests/checkout/address.test.ts',
    change: 'added',
    added: 52,
    removed: 0,
  },
  {
    path: 'README.md',
    change: 'modified',
    added: 4,
    removed: 1,
    preview: 'markdown',
  },
]

export const changeLabels: Readonly<Record<ChangeKind, string>> = {
  added: 'Added',
  modified: 'Modified',
}

/** Splits a path into its folder and its file name. */
export function splitPath(path: string): { folder: string; name: string } {
  const slash = path.lastIndexOf('/')
  return slash < 0
    ? { folder: '', name: path }
    : { folder: path.slice(0, slash), name: path.slice(slash + 1) }
}

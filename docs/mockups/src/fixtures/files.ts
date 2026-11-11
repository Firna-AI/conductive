/**
 * The files of the open workspace: the tree for "All", and the changes
 * against the default branch for "Changes".
 */

export type ChangeKind = 'added' | 'modified' | 'deleted'

export type TreeEntry = {
  name: string
  /** Nesting depth from the repository root. */
  depth: number
  folder: boolean
  /** A folder whose children show below it. */
  open?: boolean
  change?: ChangeKind
  /** The tab that opening this file shows, when the mockups draw one. */
  preview?: 'code' | 'markdown' | 'image' | 'image-not-drawn'
}

export const fileTree: readonly TreeEntry[] = [
  { name: '.github', depth: 0, folder: true },
  { name: 'prisma', depth: 0, folder: true },
  { name: 'public', depth: 0, folder: true },
  { name: 'src', depth: 0, folder: true, open: true },
  { name: 'app', depth: 1, folder: true, open: true },
  { name: 'api', depth: 2, folder: true },
  { name: 'checkout', depth: 2, folder: true, open: true },
  { name: 'AddressForm.tsx', depth: 3, folder: false, change: 'modified' },
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

/** The image files of the branch, in its public folder. */
export const branchPictures = {
  /** The picture of the checkout on a phone, which the README shows. */
  picture: 'public/checkout-mobile.png',
  /** A file with the name of a picture whose bytes no browser can draw. */
  damaged: 'public/social-card.png',
} as const

/**
 * The tree with the public folder open, with its two images. The tabs of
 * these images show the tree this way, with the row of the open image
 * marked.
 */
export function withPublicOpen(tree: readonly TreeEntry[]): TreeEntry[] {
  const at = tree.findIndex(
    (entry) => entry.depth === 0 && entry.name === 'public',
  )
  if (at < 0) return [...tree]
  const image = (path: string, preview: TreeEntry['preview']): TreeEntry => ({
    name: splitPath(path).name,
    depth: 1,
    folder: false,
    preview,
  })
  return [
    ...tree.slice(0, at),
    { ...tree[at], open: true },
    image(branchPictures.picture, 'image'),
    image(branchPictures.damaged, 'image-not-drawn'),
    ...tree.slice(at + 1),
  ]
}

export type ChangedFile = {
  path: string
  change: ChangeKind
  added: number
  removed: number
  /** The file has a drawn diff, which opening it from Changes shows. */
  diff?: boolean
}

export const changedFiles: readonly ChangedFile[] = [
  {
    path: 'src/app/checkout/useAddressAutocomplete.ts',
    change: 'added',
    added: 64,
    removed: 0,
  },
  {
    path: 'src/app/checkout/AddressForm.tsx',
    change: 'modified',
    added: 38,
    removed: 6,
    diff: true,
  },
  {
    path: 'src/app/checkout/postcodeLookup.ts',
    change: 'deleted',
    added: 0,
    removed: 41,
  },
  {
    path: 'tests/checkout/address.test.ts',
    change: 'added',
    added: 52,
    removed: 0,
  },
  { path: 'README.md', change: 'modified', added: 4, removed: 1 },
]

export const changeLabels: Readonly<Record<ChangeKind, string>> = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
}

/** Splits a path into its folder and its file name. */
export function splitPath(path: string): { folder: string; name: string } {
  const slash = path.lastIndexOf('/')
  return slash < 0
    ? { folder: '', name: path }
    : { folder: path.slice(0, slash), name: path.slice(slash + 1) }
}

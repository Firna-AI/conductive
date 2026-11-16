import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { File, FileCode, FileDiff, FileText } from 'lucide-react'
import { screenshotCopy } from '../../fixtures/attachments'
import {
  addressFormDiff,
  autocompleteHook,
  readme,
} from '../../fixtures/fileContents'
import { maskedDiffPath, seedScriptDiff } from '../../fixtures/maskedFiles'
import { branchPictures, splitPath } from '../../fixtures/files'
import { CheckoutPicture, screenshotSize } from '../../fixtures/pictures'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { CodeView } from './CodeView'
import { DiffStat } from './DiffStat'
import { DiffView } from './DiffView'
import type { FileTabView } from './FilesPanel'
import { ImageView } from './ImageView'
import { MarkdownView } from './MarkdownView'

/** What the page of a file shows: its header and its content. */
export type FileSpec = {
  /** The label of the path, which hides each secret value. */
  path: string
  icon: LucideIcon
  meta?: ReactNode
  content: ReactNode
  /** The file did not open, so the header has no Download and no Copy. */
  closed?: true
  /** The file is not text, so the header keeps Download, and Copy is off. */
  binary?: true
}

/**
 * The picture of an image file. The tab shows a PNG, JPEG, GIF, or WebP
 * file by its name as a picture, up to the read limit of the file tab.
 */
function picture(path: string, overlap: boolean): FileSpec {
  return {
    path,
    icon: File,
    content: (
      <ImageView size={screenshotSize}>
        <CheckoutPicture label={splitPath(path).name} overlap={overlap} />
      </ImageView>
    ),
    binary: true,
  }
}

/**
 * The state of a file whose bytes the browser cannot draw, as for each
 * binary file: the tab offers its download.
 */
function notDrawn(path: string): FileSpec {
  return {
    path,
    icon: File,
    content: (
      <emptyState.Component
        action={
          <actionButton.Component moklyInstance="download-binary-file">
            Download
          </actionButton.Component>
        }
        body="It is a binary file."
        icon="file-box"
        moklyInstance="binary-file"
        title="Download this file to open it"
      />
    ),
    binary: true,
  }
}

/** The page of each kind of file that the mockups open as a tab. */
export function specFor(view: FileTabView): FileSpec {
  switch (view) {
    case 'code':
      return {
        path: 'src/app/checkout/useAddressAutocomplete.ts',
        icon: FileCode,
        meta: `${autocompleteHook.split('\n').length} lines`,
        content: <CodeView code={autocompleteHook} />,
      }
    case 'markdown':
      return {
        path: 'README.md',
        icon: FileText,
        content: <MarkdownView blocks={readme} />,
      }
    case 'diff':
      return {
        path: 'src/app/checkout/AddressForm.tsx',
        icon: FileDiff,
        meta: <DiffStat added={38} removed={6} />,
        content: <DiffView hunks={addressFormDiff} />,
      }
    case 'masked-diff':
      return {
        path: maskedDiffPath,
        icon: FileDiff,
        meta: <DiffStat added={6} removed={0} />,
        content: <DiffView hunks={seedScriptDiff} />,
      }
    case 'unnamed':
      return {
        path: 'File',
        icon: FileCode,
        content: (
          <emptyState.Component
            icon="file-x"
            moklyInstance="missing-file"
            title="This file moved or was deleted"
          />
        ),
        closed: true,
      }
    case 'image':
      return picture(branchPictures.picture, false)
    case 'image-not-drawn':
      return notDrawn(branchPictures.damaged)
    case 'attachment':
      return picture(screenshotCopy.path, true)
  }
}

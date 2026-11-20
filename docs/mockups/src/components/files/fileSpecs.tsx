import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileBox,
  FileCode,
  FileDiff,
  FileText,
  FileX,
} from 'lucide-react'
import { answerShot } from '../../fixtures/answerFiles'
import { screenshotCopy } from '../../fixtures/attachments'
import {
  addressFormDiff,
  autocompleteHook,
  readme,
} from '../../fixtures/fileContents'
import { maskedDiffPath, seedScriptDiff } from '../../fixtures/maskedFiles'
import { branchPictures, splitPath } from '../../fixtures/files'
import {
  CheckoutPicture,
  screenshotSize,
  type CheckoutView,
} from '../../fixtures/pictures'
import { ActionButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { CodeView, type LineRange } from './CodeView'
import { DiffStat } from './DiffStat'
import { DiffView } from './DiffView'
import type { FileTabView } from './FilesPanel'
import { htmlSpec } from './htmlSpecs'
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
  /**
   * The file shows rendered or as its source, so the header has the switch
   * between Preview and Source, which shows this view.
   */
  mode?: 'preview' | 'source'
  /**
   * The address of the page that the tab shows in a frame, which Open opens
   * in a new tab. The header then has Reload and Open.
   */
  pageUrl?: string
}

/**
 * The picture of an image file. The tab shows a PNG, JPEG, GIF, or WebP
 * file by its name as a picture, up to the read limit of the file tab.
 */
function picture(path: string, view: CheckoutView): FileSpec {
  return {
    path,
    icon: File,
    content: (
      <ImageView size={screenshotSize}>
        <CheckoutPicture label={splitPath(path).name} view={view} />
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
      <EmptyState
        action={<ActionButton>Download</ActionButton>}
        body="It is a binary file."
        icon={FileBox}
        title="Download this file to open it"
      />
    ),
    binary: true,
  }
}

/**
 * The lines that the answer of `file-answer` names in the hook, which a
 * press on its chip opens: the check that skips a short query.
 */
const answerLines: LineRange = { first: 19, last: 22 }

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
    case 'code-lines':
      return {
        path: 'src/app/checkout/useAddressAutocomplete.ts',
        icon: FileCode,
        meta: `${autocompleteHook.split('\n').length} lines`,
        content: <CodeView code={autocompleteHook} marked={answerLines} />,
      }
    case 'markdown':
      return {
        path: 'README.md',
        icon: FileText,
        mode: 'preview',
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
          <EmptyState icon={FileX} title="This file moved or was deleted" />
        ),
        closed: true,
      }
    case 'image':
      return picture(branchPictures.picture, 'form')
    case 'image-not-drawn':
      return notDrawn(branchPictures.damaged)
    case 'attachment':
      return picture(screenshotCopy.path, 'covered')
    case 'screenshot':
      return picture(answerShot, 'fixed')
    case 'html':
    case 'html-source':
    case 'html-opening':
    case 'html-older-software':
    case 'html-failed':
      return htmlSpec(view)
  }
}

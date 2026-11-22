import type { ReactNode } from 'react'
import { defined } from '../../defined'
import type { LucideIcon } from 'lucide-react'
import { File, FileCode, FileDiff, FileText } from 'lucide-react'
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
import { actionButton } from '../../entries/components/common/actions.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { codeView } from '../../entries/components/files/CodeView.mockup'
import type { LineRange } from './CodeView'
import { diffStat } from '../../entries/components/files/DiffStat.mockup'
import { diffView } from '../../entries/components/files/DiffView.mockup'
import type { FileTabView } from './FilesPanel'
import { htmlSpec } from './htmlSpecs'
import { imageView } from '../../entries/components/files/ImageView.mockup'
import { pictureZoomBar } from '../../entries/components/files/PictureZoomBar.mockup'
import { markdownView } from '../../entries/components/files/MarkdownView.mockup'

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

/** The scale of a fitted screenshot in the tab of a desktop screen. */
const fittedScale = 0.38

/**
 * The picture of an image file, fitted to the tab, with its zoom bar. The
 * tab shows a PNG, JPEG, GIF, or WebP file by its name as a picture, up to
 * the read limit of the file tab. Expand shows on desktop, which gives
 * `expandTo`. It leads there only with `linked`, because the catalogue
 * draws the large window of checkout-mobile.png only.
 */
function picture(
  path: string,
  view: CheckoutView,
  expandTo: string | undefined,
  linked = false,
): FileSpec {
  return {
    path,
    icon: File,
    content: (
      <imageView.Component
        bar={
          <pictureZoomBar.Component
            {...defined({ expandTo: linked ? expandTo : undefined })}
            expand={expandTo !== undefined}
            fitted
            moklyInstance="picture-zoom-bar"
            scale={fittedScale}
          />
        }
        moklyInstance="image-view"
        size={screenshotSize}
      >
        <CheckoutPicture label={splitPath(path).name} view={view} />
      </imageView.Component>
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

/**
 * The lines that the answer of `file-answer` names in the hook, which a
 * press on its chip opens: the check that skips a short query.
 */
const answerLines: LineRange = { first: 19, last: 22 }

/**
 * The page of each kind of file that the mockups open as a tab. `expandTo`
 * is the screen of the page in its large window, which Expand shows on
 * desktop.
 */
export function specFor(view: FileTabView, expandTo?: string): FileSpec {
  switch (view) {
    case 'code':
      return {
        path: 'src/app/checkout/useAddressAutocomplete.ts',
        icon: FileCode,
        meta: `${autocompleteHook.split('\n').length} lines`,
        content: (
          <codeView.Component
            code={autocompleteHook}
            moklyInstance="code-view"
          />
        ),
      }
    case 'code-lines':
      return {
        path: 'src/app/checkout/useAddressAutocomplete.ts',
        icon: FileCode,
        meta: `${autocompleteHook.split('\n').length} lines`,
        content: (
          <codeView.Component
            code={autocompleteHook}
            marked={answerLines}
            moklyInstance="code-view"
          />
        ),
      }
    case 'markdown':
      return {
        path: 'README.md',
        icon: FileText,
        mode: 'preview',
        content: (
          <markdownView.Component
            blocks={readme}
            moklyInstance="markdown-view"
          />
        ),
      }
    case 'diff':
      return {
        path: 'src/app/checkout/AddressForm.tsx',
        icon: FileDiff,
        meta: (
          <diffStat.Component
            added={38}
            moklyInstance="diff-stat"
            removed={6}
          />
        ),
        content: (
          <diffView.Component
            hunks={addressFormDiff}
            moklyInstance="diff-view"
          />
        ),
      }
    case 'masked-diff':
      return {
        path: maskedDiffPath,
        icon: FileDiff,
        meta: (
          <diffStat.Component added={6} moklyInstance="diff-stat" removed={0} />
        ),
        content: (
          <diffView.Component
            hunks={seedScriptDiff}
            moklyInstance="diff-view"
          />
        ),
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
      return picture(branchPictures.picture, 'form', expandTo, true)
    case 'image-not-drawn':
      return notDrawn(branchPictures.damaged)
    case 'attachment':
      return picture(screenshotCopy.path, 'covered', expandTo)
    case 'screenshot':
      return picture(answerShot, 'fixed', expandTo)
    case 'html':
    case 'html-source':
    case 'html-opening':
    case 'html-older-software':
    case 'html-failed':
      return htmlSpec(view)
  }
}

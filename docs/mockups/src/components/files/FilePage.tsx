import type { ReactNode } from 'react'
import { SegmentedControl } from '@firna/ui/segmented'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft,
  Code,
  Copy,
  Download,
  Eye,
  FileCode,
  FileDiff,
  FileText,
  FileX,
} from 'lucide-react'
import {
  addressFormDiff,
  autocompleteHook,
  readme,
} from '../../fixtures/fileContents'
import { splitPath } from '../../fixtures/files'
import { maskedDiffPath, seedScriptDiff } from '../../fixtures/maskedFiles'
import { noop } from '../../noop'
import { EmptyState } from '../common/EmptyState'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import type { BackLink } from '../layout/Page'
import { CodeView } from './CodeView'
import { DiffStat } from './DiffStat'
import { DiffView } from './DiffView'
import type { FileTabView } from './FilesPanel'
import { MarkdownView } from './MarkdownView'
import styles from './FilePage.module.css'

type FileSpec = {
  /** The label of the path, which hides each secret value. */
  path: string
  icon: LucideIcon
  meta?: ReactNode
  content: ReactNode
  /** The file did not open, so the header has no Download and no Copy. */
  closed?: true
}

function specFor(view: FileTabView): FileSpec {
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
          <EmptyState icon={FileX} title="This file moved or was deleted" />
        ),
        closed: true,
      }
  }
}

/** The switch between the rendered Markdown and its source. */
function ViewSwitch() {
  const { field } = useControlSizes()
  return (
    <SegmentedControl
      accessibilityLabel="Show"
      iconOnly
      onChange={noop}
      options={[
        { label: 'Preview', value: 'preview', icon: Eye },
        { label: 'Source', value: 'source', icon: Code },
      ]}
      size={field}
      value="preview"
    />
  )
}

/**
 * A file, a code preview, or a diff as a full page: a tab of the centre
 * column on desktop, and a page of the Files tab on a phone. The header
 * shows the label of the path, and the actions on the file. A file whose
 * name the app does not know shows "File".
 */
export function FilePage(props: { view: FileTabView; back?: BackLink }) {
  const spec = specFor(props.view)
  const { folder, name } = splitPath(spec.path)
  const Icon = spec.icon
  return (
    <section aria-label={name} className={styles.page}>
      <div className={styles.header}>
        <div className={styles.start}>
          {props.back ? (
            <ScreenLink className={styles.back} to={props.back.to}>
              <ChevronLeft aria-hidden size={15} />
              <span className={styles.backLabel}>{props.back.label}</span>
            </ScreenLink>
          ) : null}
          <span className={styles.chip}>
            <Icon aria-hidden className={styles.icon} size={13} />
            {folder ? <span className={styles.folder}>{folder}/</span> : null}
            <span className={styles.name}>{name}</span>
          </span>
          {spec.closed ? null : (
            <IconButton icon={Download} label={`Download ${name}`} />
          )}
        </div>
        <div className={styles.end}>
          {spec.meta ? <span className={styles.meta}>{spec.meta}</span> : null}
          <IconButton
            disabled={spec.closed}
            icon={Copy}
            label={`Copy the text of ${name}`}
          />
          {props.view === 'markdown' ? <ViewSwitch /> : null}
        </div>
      </div>
      <div className={styles.body}>{spec.content}</div>
    </section>
  )
}

import type { ReactNode } from 'react'
import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { Label } from '@firna/ui/typography'
import { ChevronLeft } from 'lucide-react'
import { splitPath } from '../../fixtures/files'
import { noop } from '../../noop'
import styles from './PreviewHeader.module.css'

/** The back link, file name, and details above a file preview. */
export function PreviewHeader(props: {
  back: { label: string; to: string }
  path: string
  meta?: ReactNode
}) {
  const { folder, name } = splitPath(props.path)
  return (
    <div className={styles.header}>
      <MockLink asChild to={props.back.to}>
        <Button icon={ChevronLeft} onPress={noop} size="sm" tone="plain">
          {props.back.label}
        </Button>
      </MockLink>
      <div className={styles.file}>
        <Label numberOfLines={1}>{name}</Label>
        {folder ? <span className={styles.folder}>{folder}</span> : null}
      </div>
      {props.meta}
    </div>
  )
}

import type { ReactNode } from 'react'
import { MockLink } from '@mokly/mokly'
import { ChevronLeft } from 'lucide-react'
import { splitPath } from '../../fixtures/files'
import styles from './PreviewHeader.module.css'

/** The way back, the file name, and its details above a file preview. */
export function PreviewHeader(props: {
  back: { label: string; to: string }
  path: string
  meta?: ReactNode
}) {
  const { folder, name } = splitPath(props.path)
  return (
    <div className={styles.header}>
      <MockLink className={styles.back} to={props.back.to}>
        <ChevronLeft size={15} />
        {props.back.label}
      </MockLink>
      <span className={styles.file}>
        {folder ? <span className={styles.folder}>{folder}/</span> : null}
        <span className={styles.name}>{name}</span>
      </span>
      {props.meta}
    </div>
  )
}

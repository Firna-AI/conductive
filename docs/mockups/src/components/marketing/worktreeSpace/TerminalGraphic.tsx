import type { ReactNode } from 'react'
import { classes } from '../../common/classes'
import { PartsLegend } from './PartsLegend'
import {
  agentNames,
  formatSize,
  totalGb,
  worktreeGb,
  worktreeParts,
  worktreeSpaceCopy,
} from './worktreeSpace'
import parts from './parts.module.css'
import styles from './TerminalGraphic.module.css'

/** The folder of the worktrees in the terminal of the visitor. */
const folder = '~/worktrees'

/** The number of blocks of the bar of one worktree. */
const blocks = 16

/** The bar of one worktree: blocks in the colour of each part. */
function Blocks() {
  return worktreeParts.map((part) => (
    <span className={styles.blocks} data-part={part.key} key={part.key}>
      {'█'.repeat(Math.round((part.gb / worktreeGb) * blocks))}
    </span>
  ))
}

/** A size as `du -h` prints it, such as `4.9G`. */
function duSize(gb: number): string {
  return formatSize(gb).replace(' GB', 'G').replace(' MB', 'M')
}

/** A window of a terminal, with its title and its lines. */
function Terminal(props: {
  title: string
  cloud?: boolean
  children: ReactNode
}) {
  return (
    <div className={classes(styles.window, props.cloud && styles.cloud)}>
      <div className={styles.titleBar}>
        <span className={styles.dots} aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className={parts.caption}>{props.title}</span>
      </div>
      <pre className={styles.body}>{props.children}</pre>
    </div>
  )
}

/**
 * Variation B, terminal: the command that a developer runs to find what
 * fills the disk. Each worktree prints its size with a bar of blocks, and
 * the total ends the list. With Conductive, the same folder is empty.
 */
export function TerminalGraphic(props: { mobile: boolean }) {
  return (
    <div className={parts.stack}>
      <div
        className={classes(parts.compare, props.mobile && parts.compareMobile)}
      >
        <Terminal title={worktreeSpaceCopy.local}>
          <span className={styles.prompt}>$ </span>
          {`du -shc ${folder}/*\n`}
          {agentNames().map((name) => (
            <span key={name}>
              {`${duSize(worktreeGb).padStart(5)}  ${name}  `}
              <Blocks />
              {'\n'}
            </span>
          ))}
          <span className={styles.total}>
            {`${duSize(totalGb).padStart(5)}  total\n`}
          </span>
        </Terminal>
        <Terminal cloud title={worktreeSpaceCopy.cloud}>
          <span className={styles.prompt}>$ </span>
          {`du -shc ${folder}/*\n`}
          <span className={styles.muted}>
            {`du: ${folder}/*: No such file or directory\n`}
          </span>
          <span className={styles.total}>{'   0B  total\n'}</span>
          {'\n'}
          <span className={styles.note}>
            {'# Each agent works on its own cloud computer.'}
          </span>
        </Terminal>
      </div>
      <PartsLegend showFolders />
    </div>
  )
}

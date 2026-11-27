import {
  formatSize,
  parallelAgents,
  sharedHistory,
  worktreeGb,
  worktreeSpaceCopy,
} from './worktreeSpace'
import { classes } from '../../common/classes'
import parts from './parts.module.css'
import styles from './GrowthGraphic.module.css'

/** The legend of the two lines, which a phone needs for lack of room. */
function SeriesLegend() {
  return (
    <ul className={parts.legend}>
      <li className={parts.legendItem}>
        <span className={classes(parts.swatch, parts.build)} />
        {worktreeSpaceCopy.local}
      </li>
      <li className={parts.legendItem}>
        <span className={classes(parts.swatch, parts.cloud)} />
        {`${worktreeSpaceCopy.cloud}: 0 GB on your computer`}
      </li>
    </ul>
  )
}

/** The most agents on the x axis, and the top of the y axis in GB. */
const maxAgents = 10
const maxGb = 50

/** The size of the plot in each layout, in px of the drawing. */
const layouts = {
  desktop: { width: 760, height: 300, left: 52, right: 190, ticks: 10 },
  mobile: { width: 340, height: 280, left: 40, right: 16, ticks: 5 },
} as const

/** Disk space that `count` agents take on one computer, in GB. */
function localGb(count: number): number {
  return count * worktreeGb + sharedHistory.gb
}

/**
 * Variation E, growth: a line chart of the disk space that the worktrees
 * take as agents join, one worktree each. Conductive stays flat at zero.
 * Each point has a native tooltip, because the site runs no script.
 */
export function GrowthGraphic(props: { mobile: boolean }) {
  const layout = props.mobile ? layouts.mobile : layouts.desktop
  const { width, height, left, right } = layout
  const top = 16
  const bottom = height - 44
  const x = (count: number) =>
    left + ((count - 1) / (maxAgents - 1)) * (width - left - right)
  const y = (gb: number) => bottom - (gb / maxGb) * (bottom - top)
  const counts = Array.from({ length: maxAgents }, (_, index) => index + 1)
  const line = (gb: (count: number) => number) =>
    counts
      .map((count, i) => `${i ? 'L' : 'M'}${x(count)} ${y(gb(count))}`)
      .join(' ')
  const xTicks = counts.filter(
    (count) => count === 1 || count % (maxAgents / layout.ticks) === 0,
  )
  const mark = parallelAgents
  return (
    <div className={parts.stack}>
      <svg className={styles.svg} role="img" viewBox={`0 0 ${width} ${height}`}>
        <title>{`Disk space of the worktrees: ${formatSize(localGb(maxAgents))} for ${maxAgents} agents on your computer, 0 GB with Conductive`}</title>
        {[0, 10, 20, 30, 40, 50].map((gb) => (
          <g key={gb}>
            <line
              className={styles.grid}
              x1={left}
              x2={width - right}
              y1={y(gb)}
              y2={y(gb)}
            />
            <text
              className={styles.tick}
              textAnchor="end"
              x={left - 8}
              y={y(gb) + 4}
            >
              {gb ? `${gb} GB` : '0'}
            </text>
          </g>
        ))}
        {xTicks.map((count) => (
          <text
            className={styles.tick}
            key={count}
            textAnchor="middle"
            x={x(count)}
            y={bottom + 22}
          >
            {count}
          </text>
        ))}
        <text
          className={styles.axis}
          textAnchor="middle"
          x={(left + width - right) / 2}
          y={height - 4}
        >
          Agents working side by side
        </text>
        <line
          className={styles.guide}
          x1={x(mark)}
          x2={x(mark)}
          y1={y(localGb(mark))}
          y2={bottom}
        />
        <path className={styles.local} d={line(localGb)} />
        <path className={styles.cloud} d={line(() => 0)} />
        {counts.map((count) => (
          <g key={count}>
            <circle
              className={styles.localDot}
              cx={x(count)}
              cy={y(localGb(count))}
              r={4}
            >
              <title>{`${count} agents on your computer: ${formatSize(localGb(count))}`}</title>
            </circle>
            <circle className={styles.cloudDot} cx={x(count)} cy={y(0)} r={4}>
              <title>{`${count} agents with Conductive: 0 GB on your computer`}</title>
            </circle>
          </g>
        ))}
        <text
          className={styles.callout}
          x={x(mark) + 10}
          y={y(localGb(mark)) + 18}
        >
          {`${mark} agents: ${formatSize(localGb(mark))}`}
        </text>
        {props.mobile ? null : (
          <>
            <text
              className={styles.end}
              x={x(maxAgents) + 12}
              y={y(localGb(maxAgents)) + 4}
            >
              {`${worktreeSpaceCopy.local}, ${formatSize(localGb(maxAgents))}`}
            </text>
            <text className={styles.end} x={x(maxAgents) + 12} y={y(0) + 4}>
              {`${worktreeSpaceCopy.cloud}, 0 GB`}
            </text>
          </>
        )}
      </svg>
      <SeriesLegend />
    </div>
  )
}

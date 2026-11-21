import { classes } from '../../common/classes'
import { PanelHead } from './PanelHead'
import { PartsLegend } from './PartsLegend'
import {
  agentNames,
  formatSize,
  parallelAgents,
  totalGb,
  worktreeGb,
  worktreeParts,
  worktreeSpaceCopy,
} from './worktreeSpace'
import parts from './parts.module.css'
import styles from './LaptopGraphic.module.css'

/** The outline of a laptop: its screen, then its base. */
function Laptop(props: {
  x: number
  y: number
  width: number
  height: number
}) {
  const { x, y, width, height } = props
  const lip = width * 0.06
  return (
    <g>
      <rect
        className={styles.screen}
        height={height}
        rx={8}
        width={width}
        x={x}
        y={y}
      />
      <path
        className={styles.base}
        d={`M${x - lip} ${y + height} h${width + lip * 2} l-${lip} 10 h-${width} z`}
      />
    </g>
  )
}

/**
 * One worktree as a bar of its parts, from `x`, `width` wide. Each part
 * keeps a 2 px gap of the surface before the next part.
 */
function WorktreeParts(props: {
  x: number
  y: number
  width: number
  height: number
}) {
  let left = props.x
  return worktreeParts.map((part) => {
    const width = Math.max(2, (part.gb / worktreeGb) * props.width - 2)
    const rect = (
      <rect
        className={parts[part.key]}
        height={props.height}
        key={part.key}
        rx={2}
        width={width}
        x={left}
        y={props.y}
      >
        <title>{`${part.label}: ${formatSize(part.gb)}`}</title>
      </rect>
    )
    left += width + 2
    return rect
  })
}

/** The laptop of the visitor, whose storage bar holds six worktrees. */
function LocalLaptop() {
  const names = agentNames()
  const slot = 312 / names.length
  return (
    <svg className={styles.svg} role="img" viewBox="0 0 400 230">
      <title>{`${parallelAgents} worktrees take ${formatSize(totalGb)} of the disk of a laptop`}</title>
      <Laptop height={190} width={340} x={30} y={10} />
      <text className={styles.caption} x={50} y={44}>
        STORAGE
      </text>
      <text className={styles.label} x={50} y={70}>
        Worktrees
      </text>
      <text className={styles.value} textAnchor="end" x={350} y={70}>
        {formatSize(totalGb)}
      </text>
      {names.map((name, index) => (
        <g key={name}>
          <WorktreeParts
            height={28}
            width={slot}
            x={44 + index * slot}
            y={92}
          />
          <text
            className={styles.agent}
            textAnchor="middle"
            x={44 + index * slot + slot / 2}
            y={140}
          >
            {name}
          </text>
        </g>
      ))}
      <text className={styles.note} x={50} y={176}>
        {`Each one: ${formatSize(worktreeGb)}`}
      </text>
    </svg>
  )
}

/** The laptop with Conductive, linked to one cloud computer per agent. */
function CloudLaptop() {
  const names = agentNames()
  return (
    <svg className={styles.svg} role="img" viewBox="0 0 400 230">
      <title>{`${parallelAgents} workspaces, each on its own cloud computer`}</title>
      {names.map((name, index) => {
        const y = 6 + index * 37
        return (
          <g key={name}>
            <path
              className={styles.link}
              d={`M176 92 C 210 92, 200 ${y + 15}, 236 ${y + 15}`}
            />
            <rect
              className={styles.tile}
              height={30}
              rx={5}
              width={158}
              x={236}
              y={y}
            />
            <text className={styles.agent} x={246} y={y + 19}>
              {name}
            </text>
            <WorktreeParts height={8} width={72} x={310} y={y + 11} />
          </g>
        )
      })}
      <Laptop height={120} width={150} x={22} y={32} />
      {names.map((name, index) => (
        <g key={name}>
          <circle className={styles.dot} cx={40} cy={54 + index * 16} r={3} />
          <text className={styles.agent} x={50} y={57 + index * 16}>
            {name}
          </text>
        </g>
      ))}
      <text className={styles.note} x={20} y={196}>
        Your computer shows the work.
      </text>
      <text className={styles.note} x={20} y={214}>
        It stores no worktree.
      </text>
    </svg>
  )
}

/**
 * Variation D, laptop: the storage of a laptop that six worktrees fill,
 * beside a laptop that shows six workspaces, each on its own cloud
 * computer.
 */
export function LaptopGraphic(props: { mobile: boolean }) {
  return (
    <div className={parts.stack}>
      <div
        className={classes(parts.compare, props.mobile && parts.compareMobile)}
      >
        <div className={parts.panel}>
          <PanelHead
            caption={worktreeSpaceCopy.local}
            figure={formatSize(totalGb)}
            sub="of worktrees on your disk"
          />
          <LocalLaptop />
        </div>
        <div className={classes(parts.panel, parts.panelCloud)}>
          <PanelHead
            caption={worktreeSpaceCopy.cloud}
            cloud
            figure="0 GB"
            sub="of worktrees on your disk"
          />
          <CloudLaptop />
        </div>
      </div>
      <PartsLegend />
    </div>
  )
}

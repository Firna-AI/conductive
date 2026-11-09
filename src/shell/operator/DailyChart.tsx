import { useState } from 'react'
import { ChartTableView, LineChart } from '@firna/ui/chart'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import type { OperatorOverview } from '../../shared/operator'
import { useViewport, type Viewport } from '../ui/viewport'
import { formatCount, formatShortDay } from './format'
import styles from './operator.module.css'

/** A count of one UTC day. */
type Day = OperatorOverview['newUsersByDay'][number]

/**
 * The width of a plot before the browser measures it: the page column less
 * the padding of its section, as in the mockups.
 */
const plotWidth: Readonly<Record<Viewport, number>> = {
  desktop: 602,
  phone: 320,
}

/**
 * Each day at noon UTC, so that the local date of the axis and the tooltip
 * is the UTC day in every time zone from UTC-11 to UTC+11.
 */
function noonUtc(day: Day): number {
  return Date.parse(`${day.date}T12:00Z`)
}

/**
 * The days of a chart as a table, under the toggle that the chart has. The
 * table of the Firna chart names each day of a time axis by its number of
 * milliseconds, so the page gives its own table with the UTC day.
 */
function DayTable(props: {
  title: string
  days: readonly Day[]
  readAt: number
}) {
  const [open, setOpen] = useState(false)
  const series = [
    {
      id: 'count',
      label: props.title,
      data: props.days.map((day) => day.count),
    },
  ]
  return (
    <>
      <div className={styles.tableFooter}>
        <button
          aria-expanded={open}
          className={styles.tableToggle}
          onClick={() => setOpen(!open)}
          type="button"
        >
          {open ? 'Hide data table' : 'Show data table'}
        </button>
      </div>
      {open ? (
        <div className={styles.table}>
          <ChartTableView
            accessibilityLabel={`${props.title} each day, as a table`}
            categories={props.days.map((day) =>
              formatShortDay(noonUtc(day), props.readAt, 'UTC'),
            )}
            categoryLabel="UTC day"
            series={series}
            valueFormat={formatCount}
          />
        </div>
      ) : null}
    </>
  )
}

/**
 * A count of every org on each UTC day of the last 30 days, as one area
 * over a time axis, with the total of the 30 days above it, and the table
 * of the days under it. While Refresh reads, the chart keeps its days,
 * dimmed.
 */
export function DailyChart(props: {
  title: string
  days: readonly Day[]
  readAt: number
  refreshing: boolean
}) {
  const viewport = useViewport()
  const total = props.days.reduce((sum, day) => sum + day.count, 0)
  const series = [
    {
      id: 'count',
      label: props.title,
      data: props.days.map((day) => day.count),
    },
  ]
  return (
    <Section
      description={`${formatCount(total)} in the last 30 days, by UTC day.`}
      title={props.title}
    >
      <LineChart
        accessibilityLabel={`${props.title} each day`}
        area
        categories={props.days.map(noonUtc)}
        defaultWidth={plotWidth[viewport]}
        height={180}
        includeZero
        loading={props.refreshing}
        series={series}
        showMarkers={false}
        showTableView={false}
        xScale="time"
      />
      <DayTable days={props.days} readAt={props.readAt} title={props.title} />
    </Section>
  )
}

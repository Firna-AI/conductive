import { useState } from 'react'
import { ChartTableView, LineChart } from '@firna/ui/chart'
import { Section } from '../settings/Section'
import styles from './DailyChart.module.css'

/** A count of one UTC day, with the day as `YYYY-MM-DD`. */
export type DayCount = { date: string; count: number }

/**
 * The width of the plot inside a section, before the browser measures it:
 * the page column less the padding of the section. A view of the mockups
 * runs no script, so the chart keeps this width.
 */
const plotWidth = { wide: 602, narrow: 320 } as const

const withoutYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

const withYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * The words of a UTC day, such as "10 Oct", or "10 Oct 2026" with its
 * year. They come from the date alone, in UTC and in British English, so
 * no time zone and no locale of the browser or of the build machine
 * changes them. A date that does not read stays as it is.
 */
export function dayLabel(date: string, year = false): string {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(time)) return date
  return (year ? withYear : withoutYear).format(time)
}

/**
 * The days of a chart as a table, under a toggle in the look of the one
 * of the Firna chart. The table of the Firna chart cannot name its first
 * column, so the chart gives its own, with the UTC day. A day of another
 * year than the last day has its year.
 */
function DayTable(props: { title: string; days: readonly DayCount[] }) {
  const [open, setOpen] = useState(false)
  const lastYear = props.days.at(-1)?.date.slice(0, 4)
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
              dayLabel(day.date, day.date.slice(0, 4) !== lastYear),
            )}
            categoryLabel="UTC day"
            series={series}
            valueFormat={(value) => value.toLocaleString('en')}
          />
        </div>
      ) : null}
    </>
  )
}

/**
 * A count of every org on each UTC day of the last 30 days, as one area
 * with the total of the 30 days above it, and the table of the days under
 * it. Each point and each label of the axis has the words of its UTC day,
 * without the year, so that each label fits its slot. The axis has one
 * slot for each day, and it shows every few labels. While a read runs,
 * the chart keeps its days, dimmed. It imports no fixture, so the app uses
 * it too.
 */
export function DailyChart(props: {
  title: string
  days: readonly DayCount[]
  /** The page is as narrow as a phone. */
  narrow: boolean
  /** A read of the days runs. */
  refreshing?: boolean
}) {
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
      description={`${total.toLocaleString('en')} in the last 30 days, by UTC day.`}
      title={props.title}
    >
      <LineChart
        accessibilityLabel={`${props.title} each day`}
        area
        categories={props.days.map((day) => dayLabel(day.date))}
        defaultWidth={props.narrow ? plotWidth.narrow : plotWidth.wide}
        height={180}
        includeZero
        loading={props.refreshing}
        series={series}
        showMarkers={false}
        showTableView={false}
        xScale="band"
      />
      <DayTable days={props.days} title={props.title} />
    </Section>
  )
}

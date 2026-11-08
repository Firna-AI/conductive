import type { Viewport } from '@mokly/mokly'
import { LineChart } from '@firna/ui/chart'
import type { DailyCount } from '../../fixtures/operator'
import { Section } from '../settings/Section'

/**
 * The width of the plot inside a section, before the browser measures it:
 * the page column less the padding of the section. A view runs no script,
 * so the chart keeps this width.
 */
const plotWidth: Readonly<Record<Viewport, number>> = {
  desktop: 602,
  mobile: 320,
}

/**
 * Each day at noon UTC, so that the local date of the axis and the
 * tooltip is the UTC day in every time zone from UTC-11 to UTC+11.
 */
function noonUtc(row: DailyCount): number {
  return Date.parse(`${row.date}T12:00Z`)
}

/**
 * A count of every org on each UTC day of the last 30 days, as one area
 * over a time axis, with the total of the 30 days above it. The table
 * toggle under the chart lists every day.
 */
export function DailyChart(props: {
  title: string
  rows: readonly DailyCount[]
  viewport: Viewport
}) {
  const total = props.rows.reduce((sum, row) => sum + row.count, 0)
  const series = [
    { id: 'count', label: props.title, data: props.rows.map((r) => r.count) },
  ]
  return (
    <Section
      description={`${total.toLocaleString('en')} in the last 30 days, by UTC day.`}
      title={props.title}
    >
      <LineChart
        accessibilityLabel={`${props.title} each day`}
        area
        categories={props.rows.map(noonUtc)}
        defaultWidth={plotWidth[props.viewport]}
        height={180}
        includeZero
        series={series}
        showMarkers={false}
        xScale="time"
      />
    </Section>
  )
}

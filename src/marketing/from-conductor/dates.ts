export const conductorCloudDays = {
  readOnly: '2026-11-13',
  shutDown: '2026-11-20',
} as const

export const conductorAnnouncementHref =
  'https://www.conductor.build/announcement'

export const dueRule =
  'A due date is a recorded delivery commitment. Without one, an In progress or Planned row shows “No date yet”.'

const longDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function dayWords(day: string, length: 'long' | 'short'): string {
  const time = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(time)) return day
  return (length === 'long' ? longDay : shortDay).format(time)
}

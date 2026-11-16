import { fetchFiles } from '../../test-support/fake-files'
import type { FetchLike, FileTransport } from '../api/client'

/** The share in the query, such as `64` for `?sent=64`, or null. */
function sentPercent(value: string | null): number | null {
  if (value === null || !/^\d{1,2}$/.test(value)) return null
  return Number(value)
}

/**
 * The file transport of the dev fake: each raw part through the fake fetch.
 * A fetch measures no sent bytes. So for a look at the measured state,
 * `?sent=<percent>` makes this fixture report that share of each part as
 * sent before the request, such as `?upload=wait&sent=64`. It reports the
 * fewest bytes that reach the share, so the chip of a file of one part
 * shows that percent. A file of few bytes can show the next percent, such
 * as 65% for 26 of 40 bytes. Only the dev fake uses it. The app measures
 * its uploads with `xhrFileTransport`.
 */
export function devFileTransport(
  fetch: FetchLike,
  search: string,
): FileTransport {
  const send = fetchFiles(fetch)
  const percent = sentPercent(new URLSearchParams(search).get('sent'))
  if (percent === null) return send
  return (request) => {
    request.progress(Math.ceil((request.body.size * percent) / 100))
    return send(request)
  }
}

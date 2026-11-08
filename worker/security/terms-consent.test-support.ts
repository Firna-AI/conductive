export async function termsContinuation(response: Response): Promise<string> {
  if (response.status !== 200)
    throw new Error(`Consent returned ${response.status}`)
  const text = await response.text()
  const path = text.match(/href="([^"]*terms_version=[^"]*)"/)?.[1]
  if (!path) throw new Error('The consent page has no continuation')
  return path.replaceAll('&amp;', '&')
}

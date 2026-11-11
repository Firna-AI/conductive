export function providerCopy(
  options: {
    hold?: Promise<void>
    entered?: () => void
    fail?: () => boolean
  } = {},
) {
  const paths: string[] = []
  const copies: Uint8Array[] = []
  const fetch = async (request: Request) => {
    if (new URL(request.url).hostname === 'boat.dev') {
      const body: { path: string } = await request.json()
      paths.push(body.path)
      return Response.json({
        ok: true,
        type: 'file.upload_url',
        method: 'PUT',
        path: body.path,
        url: 'https://attachment-transfer.test/file',
        expiresAt: '2099-01-01T00:00:00Z',
      })
    }
    options.entered?.()
    await options.hold
    copies.push(new Uint8Array(await request.arrayBuffer()))
    return new Response(null, { status: options.fail?.() ? 503 : 204 })
  }
  return { paths, copies, fetch }
}

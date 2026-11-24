import installScript from '../../image/computer/install.sh?raw'

export function installComputerResponse(request: Request): Response {
  return new Response(request.method === 'HEAD' ? null : installScript, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

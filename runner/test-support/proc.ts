import type { ProcReader } from '../src/proc-ports'

export interface SocketFixture {
  port: number
  address?: string
  state?: string
  uid?: number
  inode?: string
  ipv6?: boolean
}

export function procFixture() {
  const files = new Map<string, unknown>()
  const lists = new Map<string, unknown>([['/proc', []]])
  const links = new Map<string, unknown>()
  const reads: string[] = []
  const pids: string[] = []
  const read = async (source: Map<string, unknown>, path: string) => {
    reads.push(path)
    if (!source.has(path)) throw new Error('The process exited.')
    return source.get(path)
  }
  const reader: ProcReader = {
    read: (path) => read(files, path),
    list: (path) => read(lists, path),
    link: (path) => read(links, path),
  }
  const sockets = (values: SocketFixture[], extra = '') => {
    for (const ipv6 of [false, true]) {
      const rows = values
        .filter((socket) => !!socket.ipv6 === ipv6)
        .map((socket, index) => {
          const address = socket.address ?? (ipv6 ? '0'.repeat(32) : '00000000')
          const port = socket.port.toString(16).padStart(4, '0')
          return `${index}: ${address}:${port} 00000000:0000 ${socket.state ?? '0A'} 00000000:00000000 00:00000000 00000000 ${socket.uid ?? 1000} 0 ${socket.inode ?? String(socket.port)}`
        })
      files.set(
        `/proc/net/${ipv6 ? 'tcp6' : 'tcp'}`,
        `sl local_address rem_address st tx_queue rx_queue uid timeout inode\n${rows.join('\n')}\n${extra}`,
      )
    }
  }
  sockets([])
  return {
    reader,
    files,
    reads,
    sockets,
    process: (
      pid: string,
      inodes: string[],
      command: string[],
      cwd: string,
    ) => {
      if (!pids.includes(pid)) pids.push(pid)
      lists.set('/proc', [...pids])
      lists.set(
        `/proc/${pid}/fd`,
        inodes.map((_, index) => String(index)),
      )
      for (const [index, inode] of inodes.entries())
        links.set(`/proc/${pid}/fd/${index}`, `socket:[${inode}]`)
      files.set(`/proc/${pid}/cmdline`, `${command.join('\0')}\0`)
      links.set(`/proc/${pid}/cwd`, cwd)
    },
    unreadable: (pid: string) => {
      files.delete(`/proc/${pid}/cmdline`)
      links.delete(`/proc/${pid}/cwd`)
    },
  }
}

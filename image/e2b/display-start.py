"""Report the X server ready only after its display socket accepts clients."""
import os
from pathlib import Path
import socket
import subprocess
import sys


def main():
    for path in ['/tmp/.X0-lock', '/tmp/.X11-unix/X0']:
        Path(path).unlink(missing_ok=True)
    reader, writer = os.pipe()
    with subprocess.Popen([
        '/usr/bin/Xvfb', ':0', '-screen', '0', '1920x1080x24',
        '-nolisten', 'tcp', '-noreset', '-displayfd', str(writer),
    ], pass_fds=(writer,), env={
        key: value for key, value in os.environ.items() if key != 'NOTIFY_SOCKET'
    }) as display:
        os.close(writer)
        with os.fdopen(reader) as ready:
            if ready.readline().strip() != '0':
                display.terminate()
                return 1
        address = os.environ['NOTIFY_SOCKET']
        if address.startswith('@'):
            address = '\0' + address[1:]
        with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as channel:
            channel.sendto(b'READY=1', address)
        return display.wait()


if __name__ == '__main__':
    sys.exit(main())

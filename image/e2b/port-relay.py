#!/usr/bin/python3
"""Keep private network listeners for servers that bind only to loopback."""

import asyncio
import contextlib
import fcntl
import json
import os
from pathlib import Path
import signal
import socket
import sys


RUNTIME_DIRECTORY = Path("/run/conductive-e2b")


def valid_port(value):
    return isinstance(value, int) and not isinstance(value, bool) and 0 < value < 65536


async def copy_stream(source, destination):
    while chunk := await source.read(65536):
        destination.write(chunk)
        await destination.drain()
    destination.write_eof()
    await destination.drain()


async def close_writer(writer):
    writer.close()
    with contextlib.suppress(OSError):
        await writer.wait_closed()


class PortRelay:
    def __init__(self, runtime_directory):
        self.directory = Path(runtime_directory)
        self.path = self.directory / "relay.sock"
        self.listeners = {}
        self.lock = asyncio.Lock()
        self.connections = set()
        self.control = None
        self.process_lock = None
        self.owns_socket = False

    async def start(self):
        self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.directory.chmod(0o700)
        self.process_lock = (self.directory / "relay.lock").open("a")
        fcntl.flock(self.process_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.owns_socket = True
        self.path.unlink(missing_ok=True)
        previous_umask = os.umask(0o077)
        try:
            self.control = await asyncio.start_unix_server(
                self.handle_control, path=self.path, limit=128
            )
        finally:
            os.umask(previous_umask)
        self.path.chmod(0o600)

    async def ensure(self, target_port):
        async with self.lock:
            existing = self.listeners.get(target_port)
            if existing is not None:
                return existing.sockets[0].getsockname()[1]
            for _ in range(16):
                listener = await asyncio.start_server(
                    lambda reader, writer: self.forward(target_port, reader, writer),
                    host="0.0.0.0",
                    port=0,
                )
                listen_port = listener.sockets[0].getsockname()[1]
                if listen_port != target_port:
                    self.listeners[target_port] = listener
                    return listen_port
                listener.close()
                await listener.wait_closed()
            raise OSError("No relay port is available")

    async def handle_control(self, reader, writer):
        try:
            request = json.loads(await reader.readline())
            if not isinstance(request, dict) or set(request) != {"targetPort"}:
                raise ValueError("Invalid request")
            target_port = request["targetPort"]
            if not valid_port(target_port):
                raise ValueError("Invalid target port")
            reply = {
                "targetPort": target_port,
                "listenPort": await self.ensure(target_port),
            }
        except (OSError, ValueError, UnicodeError):
            reply = {"error": "unavailable"}
        try:
            writer.write(json.dumps(reply, separators=(",", ":")).encode() + b"\n")
            await writer.drain()
        except OSError:
            pass
        finally:
            await close_writer(writer)

    async def forward(self, target_port, incoming_reader, incoming_writer):
        connection = asyncio.current_task()
        self.connections.add(connection)
        outgoing_writer = None
        tasks = []
        try:
            try:
                outgoing_reader, outgoing_writer = await asyncio.open_connection(
                    "127.0.0.1", target_port
                )
            except OSError:
                outgoing_reader, outgoing_writer = await asyncio.open_connection(
                    "::1", target_port
                )
            tasks = [
                asyncio.create_task(copy_stream(incoming_reader, outgoing_writer)),
                asyncio.create_task(copy_stream(outgoing_reader, incoming_writer)),
            ]
            await asyncio.gather(*tasks)
        except OSError:
            pass
        finally:
            for task in tasks:
                task.cancel()
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            if outgoing_writer is not None:
                await close_writer(outgoing_writer)
            await close_writer(incoming_writer)
            self.connections.discard(connection)

    async def close(self):
        servers = list(self.listeners.values())
        if self.control is not None:
            servers.append(self.control)
        for server in servers:
            server.close()
        for server in servers:
            await server.wait_closed()
        connections = list(self.connections)
        for connection in connections:
            connection.cancel()
        if connections:
            await asyncio.gather(*connections, return_exceptions=True)
        if self.owns_socket:
            self.path.unlink(missing_ok=True)
        if self.process_lock is not None:
            self.process_lock.close()


def notify_ready():
    address = os.environ.get("NOTIFY_SOCKET")
    if address:
        if address.startswith("@"):
            address = "\0" + address[1:]
        with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as channel:
            channel.sendto(b"READY=1", address)


async def serve(runtime_directory=RUNTIME_DIRECTORY, ready=notify_ready):
    relay = PortRelay(runtime_directory)
    stopped = asyncio.Event()
    loop = asyncio.get_running_loop()
    for event in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(event, stopped.set)
    try:
        await relay.start()
        ready()
        await stopped.wait()
    finally:
        await relay.close()


def ensure(target_port, runtime_directory=RUNTIME_DIRECTORY):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as channel:
        channel.settimeout(8)
        channel.connect(str(Path(runtime_directory) / "relay.sock"))
        channel.sendall(json.dumps({"targetPort": target_port}).encode() + b"\n")
        with channel.makefile("rb") as output:
            reply = json.loads(output.readline(128))
    if (
        not isinstance(reply, dict)
        or set(reply) != {"targetPort", "listenPort"}
        or reply["targetPort"] != target_port
        or not valid_port(reply["listenPort"])
        or reply["listenPort"] == target_port
    ):
        raise ValueError("Invalid relay reply")
    return reply


def main(arguments=None, runtime_directory=RUNTIME_DIRECTORY):
    arguments = sys.argv[1:] if arguments is None else arguments
    try:
        if arguments == ["serve"]:
            asyncio.run(serve(runtime_directory))
            return 0
        if len(arguments) != 2 or arguments[0] != "ensure":
            raise ValueError("Invalid command")
        target_port = int(arguments[1])
        if not valid_port(target_port):
            raise ValueError("Invalid target port")
        print(json.dumps(ensure(target_port, runtime_directory), separators=(",", ":")))
        return 0
    except (OSError, ValueError, UnicodeError):
        print("The private port relay is unavailable.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

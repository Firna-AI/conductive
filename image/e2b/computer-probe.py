"""Check the actual stdio server and a disposable Chrome page on display :0."""
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import signal
import struct
import subprocess
import sys
import tempfile
import threading


FAILURE_CLASSES = frozenset({
    'BrokenPipeError', 'FileNotFoundError', 'JSONDecodeError', 'KeyError',
    'OSError', 'PermissionError', 'RuntimeError', 'StopIteration',
    'TimeoutError', 'TimeoutExpired', 'TypeError', 'ValueError',
})


class Probe:
    def __init__(self):
        self.step = 'config'
        self.flags = {
            'computerStdio': False, 'computerOwned': False,
            'computerScreenshot': False, 'chromePage': False,
        }


def is_stdio_server(value):
    return (
        isinstance(value, dict)
        and ('type' not in value or value['type'] == 'stdio')
        and isinstance(value.get('command'), str)
        and ('args' not in value or isinstance(value['args'], list)
             and all(isinstance(arg, str) for arg in value['args']))
        and ('env' not in value or isinstance(value['env'], dict)
             and all(isinstance(item, str) for item in value['env'].values()))
        and ('timeout' not in value or type(value['timeout']) in (int, float)
             and math.isfinite(value['timeout']))
        and ('alwaysLoad' not in value or isinstance(value['alwaysLoad'], bool))
    )


def stop(process):
    if process.poll() is None:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()


class Computer:
    def __init__(self, config):
        self.process = subprocess.Popen(
            [config['command'], *config.get('args', [])],
            env={'HOME': str(Path.home()), 'PATH': '/usr/local/bin:/usr/bin:/bin'},
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True, start_new_session=True,
        )
        self.sequence = 0

    def request(self, method, params):
        self.sequence += 1
        message = {'jsonrpc': '2.0', 'id': self.sequence,
                   'method': method, 'params': params}
        self.process.stdin.write(json.dumps(message) + '\n')
        self.process.stdin.flush()
        for line in self.process.stdout:
            response = json.loads(line)
            if response.get('id') == self.sequence:
                if 'error' in response:
                    raise ValueError('The computer MCP request failed.')
                result = response['result']
                if result.get('isError'):
                    raise ValueError('The computer tool failed.')
                return result
        raise ValueError('The computer MCP process ended without a response.')


def check_page(computer, environment, directory, probe):
    title = 'Conductive E2B computer probe'
    ready = threading.Event()

    class Page(BaseHTTPRequestHandler):
        def do_GET(self):
            content = (
                f'<title>{title}</title><h1>{title}</h1>'
                '<script>requestAnimationFrame(() => requestAnimationFrame('
                '() => fetch("/ready")))</script>'
            ).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            if self.path == '/ready':
                ready.set()

        def log_message(self, *_args):
            pass

    with ThreadingHTTPServer(('127.0.0.1', 0), Page) as server:
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        browser = None
        try:
            browser = subprocess.Popen([
                '/usr/bin/google-chrome-stable', '--ozone-platform=x11',
                '--no-first-run', '--no-default-browser-check',
                '--disable-dev-shm-usage', '--force-renderer-accessibility',
                f'--user-data-dir={directory / "chrome"}',
                f'--app=http://127.0.0.1:{server.server_port}/',
            ], env=environment, stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL, start_new_session=True)
            probe.step = 'pageLoad'
            if not ready.wait(timeout=10):
                raise ValueError('Chrome did not load the disposable page.')
            probe.step = 'screenshot'
            result = computer.request('tools/call', {
                'name': 'get_desktop_state', 'arguments': {'max_image_dimension': 0},
            })
            image = next(item for item in result['content'] if item['type'] == 'image')
            png = base64.b64decode(image['data'], validate=True)
            state = result['structuredContent']
            probe.flags['computerScreenshot'] = (
                image['mimeType'] == 'image/png'
                and png[:8] == b'\x89PNG\r\n\x1a\n'
                and struct.unpack('>II', png[16:24]) == (1920, 1080)
                and state['platform'] == 'linux'
                and (state['screen_width'], state['screen_height']) == (1920, 1080)
            )
            probe.step = 'windows'
            probe.flags['chromePage'] = any(
                window.get('title') == title and window.get('is_on_screen') is True
                and 'chrome' in window.get('app_name', '').lower()
                for window in state['windows']
            )
        finally:
            if sys.exc_info()[0] is None:
                probe.step = 'cleanup'
            if browser is not None:
                stop(browser)
            server.shutdown()
            worker.join()


def main(probe):
    config_path = Path('/home/user/.claude.json')
    config = json.loads(config_path.read_text())['mcpServers']['computer']
    if not is_stdio_server(config):
        raise ValueError('The computer entry is not a stdio server.')
    expected_args = [
        'DISPLAY=:0',
        'DBUS_SESSION_BUS_ADDRESS=unix:path=/run/conductive-e2b-desktop/bus',
        'XDG_RUNTIME_DIR=/run/conductive-e2b-desktop',
        '/usr/local/bin/cua-driver',
        'mcp',
    ]
    if (config['command'] != '/usr/bin/env' or config.get('args') != expected_args
            or 'env' in config):
        raise ValueError('The computer entry does not use the installed driver on :0.')
    probe.flags['computerOwned'] = config_path.stat().st_uid == os.getuid()
    environment = {**os.environ, **dict(arg.split('=', 1) for arg in expected_args[:3])}
    probe.step = 'mcpStart'
    computer = Computer(config)
    try:
        probe.step = 'mcpInitialize'
        initialized = computer.request('initialize', {
            'protocolVersion': '2025-06-18', 'capabilities': {},
            'clientInfo': {'name': 'conductive-e2b-live', 'version': '1'},
        })
        probe.flags['computerStdio'] = initialized['protocolVersion'] == '2025-06-18'
        computer.process.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
        computer.process.stdin.flush()
        probe.step = 'chromeStart'
        with tempfile.TemporaryDirectory(prefix='computer-', dir=Path(__file__).parent) as folder:
            check_page(computer, environment, Path(folder), probe)
        return probe.flags
    finally:
        if sys.exc_info()[0] is None:
            probe.step = 'cleanup'
        stop(computer.process)


if __name__ == '__main__':
    def expired(_signal, _frame):
        raise TimeoutError('The computer probe did not finish.')

    probe = Probe()
    try:
        signal.signal(signal.SIGALRM, expired)
        signal.alarm(30)
        result = main(probe)
    except BaseException as error:
        failure = type(error).__name__
        result = {
            **probe.flags,
            'failedStep': probe.step,
            'failure': failure if failure in FAILURE_CLASSES else 'Error',
        }
    finally:
        signal.alarm(0)
    print(json.dumps(result, separators=(',', ':')))

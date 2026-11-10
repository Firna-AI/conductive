"""Emit only safe facts from the disposable live-check sandboxes."""
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

runtime = Path('/run/conductive-e2b-live')
repository = Path('/home/user/conductive-e2b-live')


def succeeds(arguments):
    return subprocess.run(arguments, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=False).returncode == 0


def service(name, operation='is-active'):
    return succeeds(['systemctl', operation, '--quiet', name])


def facts(mode):
    if mode == 'base':
        release = dict(line.split('=', 1) for line in Path('/etc/os-release').read_text().splitlines() if '=' in line)
        tools = ['node', 'npm', 'pnpm', 'bun', 'uv', 'go', 'rustc', 'java', 'gcc', 'clang', 'docker', 'git', 'gh']
        commands = [[tool, '--version'] for tool in tools]
        commands[5] = ['go', 'version']
        return {
            'ubuntu': release.get('ID', '').strip('"') == 'ubuntu' and release.get('VERSION_ID', '').strip('"') == '24.04',
            'tools': all(succeeds(command) for command in commands),
            'node24': subprocess.check_output(['node', '--version'], text=True).startswith('v24.'),
            'python312': sys.version_info[:2] == (3, 12),
            'dockerContainer': succeeds(['sudo', '-n', 'docker', 'run', '--rm', 'hello-world']),
            'noComputer': not Path('/home/user/.claude.json').exists() or not json.loads(Path('/home/user/.claude.json').read_text()).get('mcpServers', {}).get('computer'),
        }
    if mode == 'installed':
        enabled = ['conductive-runner.service', 'conductive-terminal.service', 'conductive-preview-relay.service', 'conductive-preview-relay.socket']
        return {
            'servicesEnabled': all(service(name, 'is-enabled') for name in enabled),
            'runnerGated': not service('conductive-runner.service'),
            'terminalGated': not service('conductive-terminal.service'),
        }
    if mode == 'boot':
        return {
            'systemd': Path('/proc/1/comm').read_text().strip() == 'systemd',
            'runTmpfs': subprocess.check_output(['findmnt', '-n', '-o', 'FSTYPE', '-T', '/run'], text=True).strip() == 'tmpfs',
            'servicesActive': all(service(name) for name in ['envd.service', 'docker.service', 'conductive-e2b-port-relay.service', 'conductive-preview-relay.socket', 'conductive-preview-relay.service']),
        }
    if mode == 'mark':
        phase = sys.argv[2]
        repository.mkdir(exist_ok=True)
        (repository / ('image-' + phase)).write_text('public live-check marker')
        (runtime / ('image-' + phase)).write_text('public live-check marker')
        return {'markersWritten': True}
    if mode == 'markers':
        return {
            'diskMarkers': all((repository / ('image-' + phase)).exists() for phase in ['first', 'second']),
            'runtimeMarkersGone': all(not (runtime / ('image-' + phase)).exists() for phase in ['first', 'second', 'pause']),
        }
    if mode == 'environment':
        expected, ingress_path = sys.argv[2:4]
        path = Path('/run/ascii-secrets/env.sh')
        result = subprocess.run(['/bin/bash', '-c', '. /run/ascii-secrets/env.sh; test "$CONDUCTIVE_LIVE_PROBE" = "$1"', 'probe', expected], check=False)
        ingress = Path(ingress_path)
        return {
            'envCurrent': result.returncode == 0,
            'envPrivate': stat.S_IMODE(path.stat().st_mode) == 0o600 and os.access(path, os.R_OK),
            'ingressPrivate': ingress.stat().st_uid == 0 and stat.S_IMODE(ingress.stat().st_mode) == 0o444 and stat.S_IMODE(ingress.parent.stat().st_mode) == 0o755,
        }
    raise ValueError('Unknown probe mode')


print(json.dumps(facts(sys.argv[1]), separators=(',', ':')))

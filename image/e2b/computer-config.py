"""Merge the platform computer server without replacing other agent settings."""
import json
import os
from pathlib import Path
import sys
import tempfile


def configure(path):
    temporary = None
    try:
        config = json.loads(path.read_text()) if path.exists() else {}
        if not isinstance(config, dict):
            raise ValueError('The agent settings are not an object.')
        servers = config.setdefault('mcpServers', {})
        if not isinstance(servers, dict):
            raise ValueError('The MCP settings are not an object.')
        servers['computer'] = {
            'type': 'stdio',
            'command': '/usr/bin/env',
            'args': [
                'DISPLAY=:0',
                'DBUS_SESSION_BUS_ADDRESS=unix:path=/run/conductive-e2b-desktop/bus',
                'XDG_RUNTIME_DIR=/run/conductive-e2b-desktop',
                '/usr/local/bin/cua-driver',
                'mcp',
            ],
        }
        with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, delete=False) as output:
            temporary = Path(output.name)
            json.dump(config, output, indent=2)
            output.write('\n')
        os.replace(temporary, path)
    except (OSError, ValueError) as error:
        print(f'Computer tools could not be configured: {error} Existing settings were kept.', file=sys.stderr)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    configure(Path('/home/user/.claude.json'))

import json
import os
import pwd
import secrets
import subprocess
import sys


def ensure_memory(path):
    os.makedirs(path, mode=0o700, exist_ok=True)
    filesystem = None
    longest = 0
    with open("/proc/self/mountinfo") as source:
        for line in source:
            left, right = line.split(" - ", 1)
            mount = left.split()[4]
            if path == mount or path.startswith(mount.rstrip("/") + "/"):
                if len(mount) > longest:
                    longest = len(mount)
                    filesystem = right.split()[0]
    if filesystem != "tmpfs":
        subprocess.run(["mount", "-t", "tmpfs", "-o", "mode=0700",
                        "tmpfs", path], check=True, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL)


def prepare(temporary, directory="/run/ascii-secrets", owner="user", memory=True):
    if memory:
        ensure_memory(directory)
    else:
        os.makedirs(directory, mode=0o700, exist_ok=True)
    identity = pwd.getpwnam(owner)
    os.chmod(directory, 0o700)
    if os.geteuid() == 0:
        os.chown(directory, identity.pw_uid, identity.pw_gid)
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                         os.O_NOFOLLOW, 0o600)
    try:
        if os.geteuid() == 0:
            os.fchown(descriptor, identity.pw_uid, identity.pw_gid)
    finally:
        os.close(descriptor)


def ingress_metadata(path, identity, memory=True, preserve=False):
    directory = os.path.dirname(path)
    if memory:
        ensure_memory(directory)
    else:
        os.makedirs(directory, mode=0o755, exist_ok=True)
    os.chmod(directory, 0o755)
    if preserve:
        try:
            with open(path) as current:
                previous = json.loads(current.read(4096))
            if (previous.get("sandboxId") == identity["sandboxId"] and
                    previous.get("domain") == identity["domain"] and
                    isinstance(previous.get("aliases"), dict)):
                identity = dict(identity, aliases=previous["aliases"])
        except (FileNotFoundError, ValueError, TypeError, AttributeError):
            pass
    temporary = os.path.join(directory, ".ingress-" + secrets.token_hex(16))
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                         os.O_NOFOLLOW, 0o444)
    try:
        with os.fdopen(descriptor, "w") as target:
            json.dump(identity, target, separators=(",", ":"))
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def commit(temporary, directory="/run/ascii-secrets", ingress_path=None,
           identity=None, memory=True):
    if ingress_path is not None:
        ingress_metadata(ingress_path, identity, memory, preserve=True)
    os.replace(temporary, os.path.join(directory, "env.sh"))


def main(config):
    if config["kind"] == "preview_ingress":
        ingress_metadata(config["ingressPath"], config["ingress"])
        return
    temporary = config["temporary"]
    if config["kind"] == "environment_prepare":
        prepare(temporary)
    elif config["kind"] == "environment_commit":
        commit(temporary, ingress_path=config["ingressPath"],
               identity=config["ingress"])
    elif config["kind"] == "environment_cleanup":
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == "__main__":
    main(json.loads(sys.argv[1]))

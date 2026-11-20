import json
import os
import pwd
import secrets
import signal
import subprocess
import sys

BASE = "/run/conductive-e2b-commands"


def atomic_json(path, value):
    temporary = path + ".tmp"
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as target:
        json.dump(value, target, separators=(",", ":"))
        target.flush()
        os.fsync(target.fileno())
    os.replace(temporary, path)


def start_ticks(pid):
    with open("/proc/%d/stat" % pid) as source:
        return source.read().rsplit(") ", 1)[1].split()[19]


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



def run(config, base=BASE, memory=True):
    if memory:
        ensure_memory(base)
    else:
        os.makedirs(base, mode=0o700, exist_ok=True)
    os.chmod(base, 0o700)
    while True:
        job_id = secrets.randbits(53)
        if not job_id:
            continue
        directory = os.path.join(base, str(job_id))
        try:
            os.mkdir(directory, 0o700)
            break
        except FileExistsError:
            continue

    identity = pwd.getpwnam(config["user"])
    environment = dict(os.environ)
    environment.update(HOME=identity.pw_dir, USER=identity.pw_name,
                       LOGNAME=identity.pw_name)
    credentials = {}
    if os.geteuid() == 0:
        credentials = dict(user=identity.pw_uid, group=identity.pw_gid,
                           extra_groups=os.getgrouplist(identity.pw_name,
                                                       identity.pw_gid))
    elif identity.pw_uid != os.geteuid():
        raise PermissionError("The command identity is unavailable.")

    meta = dict(processId=job_id, pid=os.getpid(),
                startTicks=start_ticks(os.getpid()))
    atomic_json(os.path.join(directory, "meta.json"), meta)
    timeout = config["timeoutSeconds"] or None
    timed_out = False if timeout is not None else None
    with open(os.path.join(directory, "stdout"), "xb", buffering=0) as stdout:
        with open(os.path.join(directory, "stderr"), "xb", buffering=0) as stderr:
            os.chmod(stdout.name, 0o600)
            os.chmod(stderr.name, 0o600)
            child = subprocess.Popen(
                ["/bin/bash", "-lc", config["command"]], stdout=stdout,
                stderr=stderr, cwd=identity.pw_dir, env=environment,
                start_new_session=True, **credentials)
            print(json.dumps(dict(processId=job_id, pid=os.getpid()),
                             separators=(",", ":")), flush=True)
            try:
                code = child.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                try:
                    os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                code = child.wait()
    if code < 0:
        code = 128 - code
    atomic_json(os.path.join(directory, "exit.json"),
                dict(processId=job_id, exitCode=code, timedOut=timed_out))


if __name__ == "__main__":
    run(json.loads(sys.argv[1]))

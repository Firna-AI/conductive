import { expect, it } from 'vitest'

import { pythonRuntime } from './runtime.test-support'

it('runs the shipped supervisor and stores raw output, private metadata, and the atomic exit result', async () => {
  await expect(
    pythonRuntime(
      'command-supervisor.py',
      `
capture = io.StringIO()
with contextlib.redirect_stdout(capture):
    runtime.run(dict(user=pwd.getpwuid(os.getuid()).pw_name,
                     command="printf 'é\\n'; printf 'warning\\n' >&2; exit 7",
                     timeoutSeconds=600), base=directory, memory=False)
ready = json.loads(capture.getvalue())
job = os.path.join(directory, str(ready["processId"]))
with open(os.path.join(job, "meta.json")) as source: meta = json.load(source)
with open(os.path.join(job, "exit.json")) as source: end = json.load(source)
with open(os.path.join(job, "stdout"), "rb") as source: stdout = source.read().decode()
with open(os.path.join(job, "stderr"), "rb") as source: stderr = source.read().decode()
print(json.dumps(dict(stdout=stdout, stderr=stderr, exitCode=end["exitCode"],
                     timedOut=end["timedOut"], matchingPid=ready["pid"] == meta["pid"],
                     safeId=0 < ready["processId"] < 2 ** 53,
                     privateDirectory=(os.stat(job).st_mode & 0o777) == 0o700,
                     privateFiles=all((os.stat(os.path.join(job, name)).st_mode & 0o777) == 0o600
                                      for name in ["stdout", "stderr", "meta.json", "exit.json"]))))
`,
    ),
  ).resolves.toEqual({
    stdout: 'é\n',
    stderr: 'warning\n',
    exitCode: 7,
    timedOut: false,
    matchingPid: true,
    safeId: true,
    privateDirectory: true,
    privateFiles: true,
  })
})

it('kills the supervised process group on the configured deadline and drops the command to its selected user', async () => {
  await expect(
    pythonRuntime(
      'command-supervisor.py',
      `
from unittest.mock import patch
from types import SimpleNamespace
waits, signals, identities = [], [], []
class Child:
    pid = 4242
    def __init__(self, *args, **kwargs): identities.append([kwargs.get("user"), kwargs.get("group"), kwargs.get("extra_groups")])
    def wait(self, timeout=None):
        waits.append(timeout)
        if timeout is not None: raise runtime.subprocess.TimeoutExpired("command", timeout)
        return -9
account = SimpleNamespace(pw_dir=directory, pw_name="user", pw_uid=1234, pw_gid=5678)
capture = io.StringIO()
with patch.object(runtime.subprocess, "Popen", Child), patch.object(runtime.os, "killpg", lambda pid, sig: signals.append([pid, sig])), patch.object(runtime.pwd, "getpwnam", return_value=account), patch.object(runtime.os, "geteuid", return_value=0), patch.object(runtime.os, "getgrouplist", return_value=[5678]), contextlib.redirect_stdout(capture):
    runtime.run(dict(user="user", command="owned", timeoutSeconds=600), base=directory, memory=False)
ready = json.loads(capture.getvalue())
with open(os.path.join(directory, str(ready["processId"]), "exit.json")) as source: end = json.load(source)
print(json.dumps(dict(exitCode=end["exitCode"], timedOut=end["timedOut"], waits=waits, signals=signals, identities=identities)))
`,
    ),
  ).resolves.toEqual({
    exitCode: 137,
    timedOut: true,
    waits: [600, null],
    signals: [[4242, 9]],
    identities: [[1234, 5678, [5678]]],
  })
})

it('precreates protected env storage and atomically publishes only the current file and ingress identity', async () => {
  await expect(
    pythonRuntime(
      'environment.py',
      `
secrets = os.path.join(directory, "secrets")
os.mkdir(secrets)
with open(os.path.join(secrets, "env.sh"), "w") as target: target.write("old value")
temporary = os.path.join(secrets, ".pending")
runtime.prepare(temporary, directory=secrets, owner=pwd.getpwuid(os.getuid()).pw_name, memory=False)
private = (os.stat(temporary).st_mode & 0o777) == 0o600
with open(temporary, "w") as target: target.write("current value")
ingress = os.path.join(directory, "preview", "ingress.json")
identity = dict(sandboxId="sandbox-one", domain="eu.e2b.test", aliases={"7682": 41235})
runtime.commit(temporary, directory=secrets, ingress_path=ingress, identity=identity, memory=False)
with open(os.path.join(secrets, "env.sh")) as source: content = source.read()
with open(ingress) as source: actual = json.load(source)
print(json.dumps(dict(content=content, private=private, removedTemporary=not os.path.exists(temporary), envMode=os.stat(os.path.join(secrets, "env.sh")).st_mode & 0o777, ingressMode=os.stat(ingress).st_mode & 0o777, identity=actual)))
`,
    ),
  ).resolves.toEqual({
    content: 'current value',
    private: true,
    removedTemporary: true,
    envMode: 0o600,
    ingressMode: 0o444,
    identity: {
      sandboxId: 'sandbox-one',
      domain: 'eu.e2b.test',
      aliases: { '7682': 41235 },
    },
  })
})

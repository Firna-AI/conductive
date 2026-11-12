import json
import os
import pwd
import sys


def operate(config, owner="user"):
    identity = pwd.getpwnam(owner)
    if os.geteuid() == 0:
        os.setgroups(os.getgrouplist(identity.pw_name, identity.pw_gid))
        os.setgid(identity.pw_gid)
        os.setuid(identity.pw_uid)
    elif os.geteuid() != identity.pw_uid:
        raise PermissionError("The file owner is unavailable.")
    temporary = config["temporary"]
    path = config["path"]
    if config["kind"] == "file_write_prepare":
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                             os.O_NOFOLLOW, 0o600)
        os.close(descriptor)
    elif config["kind"] == "file_write_commit":
        os.replace(temporary, path)
    elif config["kind"] == "file_write_cleanup":
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    operate(json.loads(sys.argv[1]))

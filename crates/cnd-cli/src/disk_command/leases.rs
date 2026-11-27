//! Check the lifetime of workspace command leases under the disk hold lock.

use std::str;

use rustix::process::Pid;

use super::{DiskIo, DiskResult, IoContext, read_optional};

pub(super) const DIRECTORY: &str = "/run/conductive-disk/leases";

pub(super) fn any_active(disk: &dyn DiskIo) -> DiskResult<bool> {
    let paths = disk.lease_paths().during("list disk hold leases")?;
    if paths.is_empty() {
        return Ok(false);
    }
    let now = disk
        .unix_seconds()
        .during("read the disk hold lease clock")?;
    let mut active = false;
    for path in paths {
        let entry = read_optional(disk, &path).during("read a disk hold lease")?;
        match entry.as_deref().and_then(parse) {
            Some((owner, deadline))
                if now < deadline
                    && disk
                        .process_exists(owner)
                        .during("check a disk hold lease owner")? =>
            {
                active = true;
            }
            _ => disk
                .remove_lease(&path)
                .during("remove a stale disk hold lease")?,
        }
    }
    Ok(active)
}

fn parse(bytes: &[u8]) -> Option<(Pid, u64)> {
    let mut fields = str::from_utf8(bytes).ok()?.split_ascii_whitespace();
    let owner = i32::try_from(fields.next()?.parse::<u32>().ok()?).ok()?;
    let owner = Pid::from_raw(owner)?;
    let deadline = fields.next()?.parse().ok()?;
    fields.next().is_none().then_some((owner, deadline))
}

//! Select a hold from the free space of the workspace root filesystem.

use std::path::{Path, PathBuf};

use super::leases;
use super::reserve;
use super::settings::decimal_line;
use super::{DiskError, DiskIo, DiskResult, IoContext, read_optional};

const EXT4: &str = "/sys/fs/ext4";
const SETTING: &str = "reserved_clusters";
pub(super) const MOUNT_INFO: &str = "/proc/self/mountinfo";
pub(super) const RESTORE_MARKER: &str = "/run/conductive-terminal/restore-ended";
pub(super) const SAVED_LINE: &str = "/var/lib/conductive/disk-line";
const DEFAULT_HOLD: u64 = 4096;
const HEADROOM_BYTES: u64 = 2_000_000_000;

#[derive(Debug)]
pub(super) struct Space {
    pub(super) blocks: u64,
    pub(super) free: u64,
    pub(super) fragment_bytes: u64,
}

impl Space {
    fn used_bytes(&self) -> DiskResult<u64> {
        if self.blocks == 0 || self.fragment_bytes == 0 {
            return Err(DiskError::InvalidSpace);
        }
        self.blocks
            .checked_sub(self.free)
            .and_then(|used| used.checked_mul(self.fragment_bytes))
            .ok_or(DiskError::InvalidSpace)
    }

    pub(super) fn hold(&self, line: u64) -> u64 {
        self.blocks
            .saturating_sub(line / self.fragment_bytes)
            .max(DEFAULT_HOLD)
            .min(self.free)
            .min(self.blocks - 1)
    }
}

pub(super) fn apply(disk: &dyn DiskIo, line: u64) -> DiskResult<()> {
    let Some(setting) = root_setting(disk)? else {
        return Ok(());
    };
    let _lock = disk.lock()?;
    let gid = disk
        .primary_gid("user")
        .during("resolve the primary group of user")?
        .ok_or(DiskError::WorkspaceUserMissing)?;
    disk.remount_root(gid)
        .during("share the ext4 root reserve with user")?;

    if leases::any_active(disk)?
        || !disk
            .exists(Path::new(RESTORE_MARKER))
            .during("check the restore marker")?
    {
        return disk
            .write_hold(&setting, DEFAULT_HOLD)
            .during("set the default hold on the root filesystem");
    }

    let space = disk
        .space()
        .during("measure space on the root filesystem")?;
    let effective = effective_line(disk, line, space.used_bytes()?)?;
    let clusters = space.hold(effective);
    disk.write_hold(&setting, clusters)
        .during("set reserved clusters on the root filesystem")?;
    reserve::keep(disk, clusters)
}

fn effective_line(disk: &dyn DiskIo, line: u64, used: u64) -> DiskResult<u64> {
    if used <= line {
        disk.remove_line().during("remove the saved disk line")?;
        return Ok(line);
    }
    let with_headroom = used.saturating_add(HEADROOM_BYTES);
    let saved = read_optional(disk, Path::new(SAVED_LINE))
        .during("read the saved disk line")?
        .map(|value| decimal_line(value.trim_ascii(), SAVED_LINE))
        .transpose()?;
    let effective = saved.unwrap_or(with_headroom).min(with_headroom).max(line);
    if saved != Some(effective) {
        disk.save_line(effective)
            .during("save the effective disk line")?;
    }
    Ok(effective)
}

fn root_setting(disk: &dyn DiskIo) -> DiskResult<Option<PathBuf>> {
    let mounts = disk
        .read(Path::new(MOUNT_INFO))
        .during("read mount information")?;
    let mounts = String::from_utf8_lossy(&mounts);
    let (device, filesystem) = mounts
        .lines()
        .rev()
        .find_map(|line| {
            let (mount, filesystem) = line.split_once(" - ")?;
            let mut mount = mount.split_ascii_whitespace();
            let device = mount.nth(2)?;
            if mount.nth(1)? != "/" {
                return None;
            }
            Some((device, filesystem.split_ascii_whitespace().next()?))
        })
        .ok_or(DiskError::InvalidMount)?;
    if filesystem != "ext4" {
        return Ok(None);
    }
    let target = disk
        .read_link(&Path::new("/sys/dev/block").join(device))
        .during("resolve the root ext4 device")?;
    let name = target.file_name().ok_or(DiskError::InvalidMount)?;
    Ok(Some(Path::new(EXT4).join(name).join(SETTING)))
}

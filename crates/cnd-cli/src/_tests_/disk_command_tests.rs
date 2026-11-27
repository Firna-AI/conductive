//! Disk hold and release against a fake filesystem.

#![allow(clippy::unwrap_used)]

use std::ffi::OsStr;
use std::io::{self, ErrorKind};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use unimock::{Clause, MockFn, Unimock, matching};

use super::hold::{MOUNT_INFO, RESTORE_MARKER, SAVED_LINE, Space, apply, release};
use super::settings::{ENV_FILE, configured_line};
use super::{
    DiskError, HoldLock, MockExists, MockLock, MockRead, MockReadLink, MockRemoveLine,
    MockSaveLine, MockSettings, MockSpace, MockWriteHold,
};

const VDA_SETTING: &str = "/sys/fs/ext4/vda1/reserved_clusters";
const CONFIGURED: &str = "72000000000";

impl HoldLock for () {}

fn lock() -> impl Clause {
    let lock: Box<dyn HoldLock> = Box::new(());
    MockLock.some_call(matching!()).returns(Ok(lock))
}

fn ext4_root() -> impl Clause {
    (
        lock(),
        MockRead
            .some_call(matching!((path) if *path == Path::new(MOUNT_INFO)))
            .returns(Ok(b"19 12 253:1 / / rw shared:1 - ext4 /dev/root rw\n\
                           20 19 253:2 / /mnt rw - ext4 /dev/vda2 rw\n"
                .to_vec())),
        MockReadLink
            .some_call(matching!((path) if *path == Path::new("/sys/dev/block/253:1")))
            .returns(Ok(PathBuf::from("../../devices/block/vda/vda1"))),
    )
}

fn restore_ended(ended: bool) -> impl Clause {
    MockExists
        .some_call(matching!((path) if *path == Path::new(RESTORE_MARKER)))
        .returns(Ok(ended))
}

fn root_space(free: u64) -> impl Clause {
    MockSpace.some_call(matching!()).returns(Ok(Space {
        blocks: 20_000_000,
        free,
        fragment_bytes: 4096,
    }))
}

fn write_hold(clusters: u64) -> impl Clause {
    MockWriteHold
        .some_call(matching!((path, _) if *path == Path::new(VDA_SETTING)))
        .answers_arc(Arc::new(move |_, _, value| {
            assert_eq!(value, clusters);
            Ok(())
        }))
}

#[test]
fn reads_the_exported_line_applies_the_hold_and_clears_saved_headroom() {
    let disk = Unimock::new((
        MockRead
            .some_call(matching!((path) if *path == Path::new(ENV_FILE)))
            .returns(Ok(b"export BUILD_NOTE='temporary'\n\
                          export CONDUCTIVE_DISK_LINE_BYTES='72000000000'\n"
                .to_vec())),
        ext4_root(),
        restore_ended(true),
        root_space(2_650_000),
        MockRemoveLine.some_call(matching!()).returns(Ok(())),
        write_hold(2_421_875),
    ));
    let line = configured_line(&disk, None).unwrap().unwrap();
    apply(&disk, line).unwrap();
}

#[test]
fn clears_saved_headroom_when_usage_equals_the_line() {
    let disk = Unimock::new((
        ext4_root(),
        restore_ended(true),
        root_space(2_421_875),
        MockRemoveLine.some_call(matching!()).returns(Ok(())),
        write_hold(2_421_875),
    ));
    apply(&disk, 72_000_000_000).unwrap();
}

#[test]
fn saves_headroom_when_usage_is_one_byte_above_the_line() {
    let disk = Unimock::new((
        ext4_root(),
        restore_ended(true),
        root_space(2_421_875),
        MockRead
            .some_call(matching!((path) if *path == Path::new(SAVED_LINE)))
            .returns(Err(ErrorKind::NotFound.into())),
        MockSaveLine
            .some_call(matching!(74_000_000_000))
            .returns(Ok(())),
        write_hold(1_933_594),
    ));
    apply(&disk, 71_999_999_999).unwrap();
}

#[test]
fn uses_the_environment_and_restores_the_default_before_hydration() {
    let disk = Unimock::new((ext4_root(), restore_ended(false), write_hold(4096)));
    let line = configured_line(&disk, Some(OsStr::new(CONFIGURED)))
        .unwrap()
        .unwrap();
    apply(&disk, line).unwrap();
}

#[test]
fn ignores_an_assignment_inside_another_variable_and_rejects_non_decimal_line() {
    let disk = Unimock::new((
        MockRead
            .next_call(matching!((path) if *path == Path::new(ENV_FILE)))
            .returns(Ok(b"export BUILD_NOTE='first\n\
                          export CONDUCTIVE_DISK_LINE_BYTES=999\nlast'\n"
                .to_vec())),
        MockRead
            .next_call(matching!((path) if *path == Path::new(ENV_FILE)))
            .returns(Ok(b"export CONDUCTIVE_DISK_LINE_BYTES='72e9'\n".to_vec())),
    ));
    assert_eq!(configured_line(&disk, None).unwrap(), None);
    assert!(matches!(
        configured_line(&disk, None),
        Err(DiskError::InvalidLine { location: ENV_FILE })
    ));
}

#[test]
fn leaves_non_ext4_root_alone_even_with_an_ext4_data_disk() {
    let disk = Unimock::new(
        MockRead
            .some_call(matching!((path) if *path == Path::new(MOUNT_INFO)))
            .returns(Ok(b"19 12 0:40 / / rw - overlay overlay rw\n\
                  20 19 253:1 / /data rw - ext4 /dev/vda1 rw\n"
                .to_vec())),
    );
    apply(&disk, 72_000_000_000).unwrap();
}

#[test]
fn saves_headroom_once_and_reduces_it_as_the_disk_frees_space() {
    for (free, saved, write_line, clusters) in [
        (2_000_000, None, Some(75_728_000_000), 1_511_719),
        (1_900_000, Some("75728000000\n"), None, 1_511_719),
        (
            2_100_000,
            Some("75728000000\n"),
            Some(75_318_400_000),
            1_611_719,
        ),
        (
            2_300_000,
            Some("71000000000\n"),
            Some(72_000_000_000),
            2_300_000,
        ),
    ] {
        let reads_and_hold = (
            ext4_root(),
            restore_ended(true),
            root_space(free),
            MockRead
                .some_call(matching!((path) if *path == Path::new(SAVED_LINE)))
                .returns(
                    saved
                        .map(|line| line.as_bytes().to_vec())
                        .ok_or_else(|| ErrorKind::NotFound.into()),
                ),
            write_hold(clusters),
        );
        let disk = match write_line {
            Some(expected) => Unimock::new((
                reads_and_hold,
                MockSaveLine
                    .some_call(matching!(_))
                    .answers_arc(Arc::new(move |_, line| {
                        assert_eq!(line, expected);
                        Ok(())
                    })),
            )),
            None => Unimock::new(reads_and_hold),
        };
        apply(&disk, 72_000_000_000).unwrap();
    }
}

#[test]
fn bounds_the_hold_by_the_default_then_free_and_total_space() {
    for (blocks, free, expected) in [
        (20_000, 8_000, 4096),
        (20_000, 3000, 3000),
        (1000, 1000, 999),
    ] {
        let space = Space {
            blocks,
            free,
            fragment_bytes: 4096,
        };
        assert_eq!(space.hold(72_000_000_000), expected, "{space:?}");
    }
}

#[test]
fn release_attempts_every_setting_even_after_a_write_fails() {
    let disk = Unimock::new((
        lock(),
        MockSettings.some_call(matching!()).returns(Ok(vec![
            PathBuf::from("/sys/fs/ext4/vda2/reserved_clusters"),
            PathBuf::from(VDA_SETTING),
        ])),
        MockWriteHold
            .some_call(matching!((path, 4096) if *path == Path::new("/sys/fs/ext4/vda2/reserved_clusters")))
            .returns(Err(io::Error::from(ErrorKind::PermissionDenied))),
        write_hold(4096),
    ));
    assert!(matches!(
        release(&disk),
        Err(DiskError::Io { source, .. }) if source.kind() == ErrorKind::PermissionDenied
    ));
}

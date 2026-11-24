//! Pack whole entries and required refreshes within serialized event budgets.

use std::ops::Range;

use cnd_runner_interface::file_tree::{
    FILE_EVENT_MAX_BYTES, FILE_TREE_DELTA_MAX_CHANGES, FileTreeDelta, RunnerFileEvent,
};
use serde::Serialize;

use crate::error::Result;
use crate::json::codec;

/// The part budget could not fit one unit of the update.
#[derive(Clone, Copy)]
pub(super) enum Oversized {
    /// A single ordinary entry or the report metadata.
    Entry,
    /// The group of refresh operations that must stay together.
    Refreshes,
}

/// Distinguish an impossible part budget from serialization errors.
pub(super) type Packed<T> = Result<std::result::Result<Vec<T>, Oversized>>;

fn entries<T>(items: &[T]) -> impl Iterator<Item = (&[T], Oversized)> {
    items.chunks(1).map(|entry| (entry, Oversized::Entry))
}

fn groups<'a, T: Clone + Serialize + 'a>(
    units: impl IntoIterator<Item = (&'a [T], Oversized)>,
    count: usize,
    empty: impl Fn(usize) -> Result<usize>,
) -> Packed<Vec<T>> {
    let mut result = vec![vec![]];
    let mut bytes = empty(0)?;
    if bytes > FILE_EVENT_MAX_BYTES as usize {
        return Ok(Err(Oversized::Entry));
    }
    for (items, oversized) in units {
        if items.len() > count {
            return Ok(Err(oversized));
        }
        let size = items.iter().try_fold(
            items.len().saturating_sub(1),
            |bytes, item| -> Result<usize> { Ok(bytes + codec::encode(item)?.len()) },
        )?;
        let last = result.len() - 1;
        if result[last].len() + items.len() > count
            || bytes + size + usize::from(!result[last].is_empty()) > FILE_EVENT_MAX_BYTES as usize
        {
            result.push(vec![]);
            bytes = empty(result.len() - 1)?;
        }
        if bytes + size > FILE_EVENT_MAX_BYTES as usize {
            return Ok(Err(oversized));
        }
        let last = result.len() - 1;
        bytes += size + usize::from(!result[last].is_empty());
        result[last].extend_from_slice(items);
    }
    Ok(Ok(result))
}

/// Check both delta budgets after the filter adds display labels.
pub(super) fn fits_one_delta(event: &RunnerFileEvent) -> Result<bool> {
    Ok(matches!(event, RunnerFileEvent::FilesChanged { delta }
        if delta.changes.len() <= FILE_TREE_DELTA_MAX_CHANGES as usize)
        && codec::encode(event)?.len() <= FILE_EVENT_MAX_BYTES as usize)
}

/// Keep the filtered refresh operations in one delta while packing the ordinary edits.
pub(super) fn split_delta(
    mut delta: FileTreeDelta,
    refreshes: Range<usize>,
) -> Packed<RunnerFileEvent> {
    let items = std::mem::take(&mut delta.changes);
    let units = entries(&items[..refreshes.start])
        .chain((!refreshes.is_empty()).then(|| (&items[refreshes.clone()], Oversized::Refreshes)))
        .chain(entries(&items[refreshes.end..]));
    let groups = groups(units, FILE_TREE_DELTA_MAX_CHANGES as usize, |index| {
        let mut delta = delta.clone();
        delta.revision += index as u64;
        Ok(codec::encode(&RunnerFileEvent::FilesChanged { delta })?.len())
    })?;
    Ok(groups.map(|groups| {
        groups
            .into_iter()
            .enumerate()
            .map(|(index, changes)| {
                let mut delta = delta.clone();
                delta.revision += index as u64;
                delta.changes = changes;
                RunnerFileEvent::FilesChanged { delta }
            })
            .collect()
    }))
}

pub(super) fn split(event: RunnerFileEvent) -> Result<Option<Vec<RunnerFileEvent>>> {
    match event {
        RunnerFileEvent::FilesUnavailable {} => Ok(Some(vec![event])),
        RunnerFileEvent::FilesSnapshot { mut tree } => {
            let items = std::mem::take(&mut tree.entries);
            let maximum = items.len().max(1) as u64;
            tree.part.part_number = maximum;
            tree.part.part_count = maximum;
            let empty =
                codec::encode(&RunnerFileEvent::FilesSnapshot { tree: tree.clone() })?.len();
            let Ok(groups) = groups(entries(&items), usize::MAX, |_| Ok(empty))? else {
                return Ok(None);
            };
            let total = groups.len() as u64;
            Ok(Some(
                groups
                    .into_iter()
                    .enumerate()
                    .map(|(index, entries)| {
                        let mut tree = tree.clone();
                        tree.entries = entries;
                        tree.part.part_number = index as u64 + 1;
                        tree.part.part_count = total;
                        RunnerFileEvent::FilesSnapshot { tree }
                    })
                    .collect(),
            ))
        }
        RunnerFileEvent::ChangesUpdated { mut changes } => {
            let items = std::mem::take(&mut changes.changes_response.files);
            let maximum = items.len().max(1) as u64;
            changes.runner_file_revision_part.part_number = maximum;
            changes.runner_file_revision_part.part_count = maximum;
            let empty = codec::encode(&RunnerFileEvent::ChangesUpdated {
                changes: changes.clone(),
            })?
            .len();
            let Ok(groups) = groups(entries(&items), usize::MAX, |_| Ok(empty))? else {
                return Ok(None);
            };
            let total = groups.len() as u64;
            Ok(Some(
                groups
                    .into_iter()
                    .enumerate()
                    .map(|(index, files)| {
                        let mut changes = changes.clone();
                        changes.changes_response.files = files;
                        changes.runner_file_revision_part.part_number = index as u64 + 1;
                        changes.runner_file_revision_part.part_count = total;
                        RunnerFileEvent::ChangesUpdated { changes }
                    })
                    .collect(),
            ))
        }
        RunnerFileEvent::FilesChanged { delta } => Ok(split_delta(delta, 0..0)?.ok()),
    }
}

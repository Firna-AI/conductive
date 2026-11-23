//! Bounded reads of the OpenType tables used by the font stylesheet.

use std::os::unix::fs::FileExt;

use ttf_parser::{RawFace, TableRecord};

const DIRECTORY_HEADER: usize = 12;
const DIRECTORY_ENTRY: usize = 16;
const TABLE_LIMIT: usize = 256 * 1024;

/// Raw metadata of one font face.
pub(super) struct FontTables {
    /// Family and typographic family records.
    pub(super) names: Vec<u8>,
    /// Static weight, width, and style, when present.
    pub(super) metrics: Option<Vec<u8>>,
    /// Axis ranges of a variable font, when present.
    pub(super) variations: Option<Vec<u8>>,
}

impl FontTables {
    /// Read the directory and selected tables from the verified descriptor.
    pub(super) fn read(file: &dyn FileExt, file_size: u64) -> Option<Self> {
        let mut header = [0; DIRECTORY_HEADER];
        file.read_exact_at(&mut header, 0).ok()?;
        if header.starts_with(b"ttcf") {
            return None;
        }
        let count = u16::from_be_bytes([header[4], header[5]]);
        let mut directory = Vec::from(header);
        directory.resize(DIRECTORY_HEADER + usize::from(count) * DIRECTORY_ENTRY, 0);
        file.read_exact_at(&mut directory[DIRECTORY_HEADER..], DIRECTORY_HEADER as u64)
            .ok()?;
        let raw = RawFace::parse(&directory, 0).ok()?;
        let mut names = None;
        let mut metrics = None;
        let mut variations = None;
        for table in raw.table_records {
            if u64::from(table.offset) + u64::from(table.length) > file_size {
                return None;
            }
            let destination = match &table.tag.to_bytes() {
                b"name" => &mut names,
                b"OS/2" => &mut metrics,
                b"fvar" => &mut variations,
                _ => continue,
            };
            if destination.is_some() {
                return None;
            }
            *destination = Some(read_table(file, table)?);
        }
        Some(Self {
            names: names?,
            metrics,
            variations,
        })
    }
}

fn read_table(file: &dyn FileExt, table: TableRecord) -> Option<Vec<u8>> {
    let length = usize::try_from(table.length).ok()?;
    if length > TABLE_LIMIT {
        return None;
    }
    let mut bytes = vec![0; length];
    file.read_exact_at(&mut bytes, u64::from(table.offset))
        .ok()?;
    Some(bytes)
}

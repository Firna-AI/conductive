//! Bounded reads of the OpenType tables used by the font stylesheet.

use std::collections::BTreeMap;
use std::os::unix::fs::FileExt;

use ttf_parser::head::IndexToLocationFormat;
use ttf_parser::{RawFace, TableRecord, head, hhea, maxp};

const DIRECTORY_HEADER: usize = 12;
const DIRECTORY_ENTRY: usize = 16;
const TABLE_LIMIT: usize = 256 * 1024;
const REQUIRED_TABLES: &[[u8; 4]] = &[
    *b"maxp", *b"head", *b"OS/2", *b"cmap", *b"hhea", *b"hmtx", *b"name", *b"post",
];
const GLYPH_TABLES: &[&[[u8; 4]]] = &[
    &[*b"glyf", *b"loca"],
    &[*b"CFF "],
    &[*b"CFF2"],
    &[*b"CBDT", *b"CBLC"],
    &[*b"EBDT", *b"EBLC"],
];

type Directory = BTreeMap<[u8; 4], TableRecord>;

/// Raw metadata of one font face.
pub(super) struct FontTables {
    /// Family and typographic family records.
    pub(super) names: Vec<u8>,
    /// Static weight, width, and style.
    pub(super) metrics: Vec<u8>,
    /// Axis ranges of a variable font, when present.
    pub(super) variations: Option<Vec<u8>>,
}

impl FontTables {
    /// Check the required structure and read only the selected metadata.
    pub(super) fn read(file: &dyn FileExt, file_size: u64) -> Option<Self> {
        let tables = read_directory(file, file_size)?;
        let has_data = |tag| tables.get(tag).is_some_and(|table| table.length > 0);
        if !REQUIRED_TABLES.iter().all(has_data)
            || !GLYPH_TABLES.iter().any(|set| set.iter().all(has_data))
        {
            return None;
        }

        check_layout_lengths(file, &tables)?;
        Some(Self {
            names: read_table(file, tables.get(b"name")?)?,
            metrics: read_table(file, tables.get(b"OS/2")?)?,
            variations: match tables.get(b"fvar") {
                Some(table) => Some(read_table(file, table)?),
                None => None,
            },
        })
    }
}

fn read_directory(file: &dyn FileExt, file_size: u64) -> Option<Directory> {
    let mut header = [0; DIRECTORY_HEADER];
    file.read_exact_at(&mut header, 0).ok()?;
    if header.starts_with(b"ttcf") {
        return None;
    }
    let count = u16::from_be_bytes([header[4], header[5]]);
    let mut bytes = Vec::from(header);
    bytes.resize(DIRECTORY_HEADER + usize::from(count) * DIRECTORY_ENTRY, 0);
    file.read_exact_at(&mut bytes[DIRECTORY_HEADER..], DIRECTORY_HEADER as u64)
        .ok()?;
    let raw = RawFace::parse(&bytes, 0).ok()?;
    let mut tables = BTreeMap::new();
    for table in raw.table_records {
        if u64::from(table.offset) + u64::from(table.length) > file_size {
            return None;
        }
        let tag = table.tag.to_bytes();
        if tables.insert(tag, table).is_some() && matches!(&tag, b"name" | b"OS/2" | b"fvar") {
            return None;
        }
    }
    Some(tables)
}

/// Check the table sizes needed for the declared records while allowing padding.
fn check_layout_lengths(file: &dyn FileExt, tables: &Directory) -> Option<()> {
    let head = head::Table::parse(&read_prefix::<54>(file, tables.get(b"head")?)?)?;
    let hhea = hhea::Table::parse(&read_prefix::<36>(file, tables.get(b"hhea")?)?)?;
    let maxp = maxp::Table::parse(&read_prefix::<6>(file, tables.get(b"maxp")?)?)?;
    let glyphs = u32::from(maxp.number_of_glyphs.get());
    let metrics = u32::from(hhea.number_of_metrics);
    let bearings = glyphs.checked_sub(metrics)?;
    if metrics == 0 || tables.get(b"hmtx")?.length < 4 * metrics + 2 * bearings {
        return None;
    }
    if let Some(loca) = tables.get(b"loca") {
        let offset_size = match head.index_to_location_format {
            IndexToLocationFormat::Short => 2,
            IndexToLocationFormat::Long => 4,
        };
        if loca.length < offset_size * (glyphs + 1) {
            return None;
        }
    }
    Some(())
}

fn read_prefix<const SIZE: usize>(file: &dyn FileExt, table: &TableRecord) -> Option<[u8; SIZE]> {
    if usize::try_from(table.length).ok()? < SIZE {
        return None;
    }
    let mut bytes = [0; SIZE];
    file.read_exact_at(&mut bytes, u64::from(table.offset))
        .ok()?;
    Some(bytes)
}

fn read_table(file: &dyn FileExt, table: &TableRecord) -> Option<Vec<u8>> {
    let length = usize::try_from(table.length).ok()?;
    if length > TABLE_LIMIT {
        return None;
    }
    let mut bytes = vec![0; length];
    file.read_exact_at(&mut bytes, u64::from(table.offset))
        .ok()?;
    Some(bytes)
}

//! Small OpenType directories and metadata tables for stylesheet tests.

/// OpenType outline formats used in the stylesheet fixtures.
pub(super) enum SfntFormat {
    /// TrueType outlines in `glyf` and `loca`.
    TrueType,
    /// Compact Font Format outlines in `CFF `.
    Cff,
}

/// An sfnt font with the names, width class, selection flags, and variation axes supplied.
pub(super) fn font(
    families: &[(u16, &str)],
    weight: u16,
    width: u16,
    selection: u16,
    axes: &[([u8; 4], [i16; 3])],
) -> Vec<u8> {
    let mut tables = required_tables(SfntFormat::TrueType, families, weight, width, selection);
    if !axes.is_empty() {
        tables.push((*b"fvar", variations(axes)));
    }
    sfnt(SfntFormat::TrueType, tables)
}

/// The tables of a regular face that tests can change before writing the font.
pub(super) fn regular_tables(family: &str) -> Vec<([u8; 4], Vec<u8>)> {
    required_tables(SfntFormat::TrueType, &[(1, family)], 400, 5, 0)
}

/// The tables of an italic CFF OpenType face.
pub(super) fn italic_cff_tables(family: &str) -> Vec<([u8; 4], Vec<u8>)> {
    required_tables(SfntFormat::Cff, &[(1, family)], 700, 5, 1)
}

fn required_tables(
    format: SfntFormat,
    families: &[(u16, &str)],
    weight: u16,
    width: u16,
    selection: u16,
) -> Vec<([u8; 4], Vec<u8>)> {
    let mut metrics = vec![0; 96];
    metrics[0..2].copy_from_slice(&4u16.to_be_bytes());
    metrics[4..6].copy_from_slice(&weight.to_be_bytes());
    metrics[6..8].copy_from_slice(&width.to_be_bytes());
    metrics[62..64].copy_from_slice(&selection.to_be_bytes());
    let mut head = vec![0; 54];
    head[..4].copy_from_slice(&0x0001_0000u32.to_be_bytes());
    head[12..16].copy_from_slice(&0x5f0f_3cf5u32.to_be_bytes());
    head[18..20].copy_from_slice(&1000u16.to_be_bytes());
    head[40..42].copy_from_slice(&100i16.to_be_bytes());
    head[42..44].copy_from_slice(&100i16.to_be_bytes());
    let mut hhea = vec![0; 36];
    hhea[..4].copy_from_slice(&0x0001_0000u32.to_be_bytes());
    hhea[4..6].copy_from_slice(&800i16.to_be_bytes());
    hhea[6..8].copy_from_slice(&(-200i16).to_be_bytes());
    hhea[10..12].copy_from_slice(&500u16.to_be_bytes());
    hhea[18..20].copy_from_slice(&1i16.to_be_bytes());
    hhea[34..36].copy_from_slice(&1u16.to_be_bytes());
    let mut post = vec![0; 32];
    post[..4].copy_from_slice(&0x0003_0000u32.to_be_bytes());
    let mut tables = vec![
        (*b"OS/2", metrics),
        (*b"cmap", character_map()),
        (*b"head", head),
        (*b"hhea", hhea),
        (
            *b"hmtx",
            [500u16, 0, 0]
                .into_iter()
                .flat_map(u16::to_be_bytes)
                .collect(),
        ),
        (*b"name", names(families)),
        (*b"post", post),
    ];
    match format {
        SfntFormat::TrueType => {
            let mut maxp = vec![0; 32];
            maxp[..4].copy_from_slice(&0x0001_0000u32.to_be_bytes());
            maxp[4..6].copy_from_slice(&2u16.to_be_bytes());
            maxp[6..8].copy_from_slice(&3u16.to_be_bytes());
            maxp[8..10].copy_from_slice(&1u16.to_be_bytes());
            maxp[14..16].copy_from_slice(&1u16.to_be_bytes());
            let loca = [0u16, 0, 10]
                .into_iter()
                .flat_map(u16::to_be_bytes)
                .collect();
            tables.extend([
                (*b"glyf", triangle_glyph()),
                (*b"loca", loca),
                (*b"maxp", maxp),
            ]);
        }
        SfntFormat::Cff => {
            let maxp = vec![0, 0, 0x50, 0, 0, 2];
            tables.extend([(*b"CFF ", cff_glyphs()), (*b"maxp", maxp)]);
        }
    }
    tables
}

/// An sfnt font with one regular family.
pub(super) fn regular(family: &str) -> Vec<u8> {
    sfnt(SfntFormat::TrueType, regular_tables(family))
}

fn names(families: &[(u16, &str)]) -> Vec<u8> {
    let mut table = vec![0, 0];
    table.extend(u16::try_from(families.len()).unwrap().to_be_bytes());
    table.extend(
        u16::try_from(6 + families.len() * 12)
            .unwrap()
            .to_be_bytes(),
    );
    let mut storage = Vec::new();
    for (index, (name_id, value)) in families.iter().enumerate() {
        let text: Vec<u8> = value.encode_utf16().flat_map(u16::to_be_bytes).collect();
        let language_id = 0x0409 + u16::try_from(index).unwrap();
        for field in [
            3,
            1,
            language_id,
            *name_id,
            u16::try_from(text.len()).unwrap(),
            u16::try_from(storage.len()).unwrap(),
        ] {
            table.extend(field.to_be_bytes());
        }
        storage.extend(text);
    }
    table.extend(storage);
    table
}

/// Map `A` to glyph 1 with a Windows Unicode format 4 subtable.
fn character_map() -> Vec<u8> {
    let directory = [0u16, 1, 3, 1, 0, 12];
    let format_4 = [
        4, 32, 0, 4, 4, 1, 0, 65, 0xffff, 0, 65, 0xffff, 0xffc0, 1, 0, 0,
    ];
    directory
        .into_iter()
        .chain(format_4)
        .flat_map(u16::to_be_bytes)
        .collect()
}

/// Encode a three-point TrueType outline after the empty `.notdef` glyph.
fn triangle_glyph() -> Vec<u8> {
    vec![
        0, 1, 0, 0, 0, 0, 0, 100, 0, 100, 0, 2, 0, 0, 0x31, 0x33, 0x27, 100, 100, 100,
    ]
}

/// Encode `.notdef` and a triangle as CFF Type 2 charstrings.
fn cff_glyphs() -> Vec<u8> {
    let header = [1, 0, 4, 1];
    let name = b"\0\x01\x01\x01\x08Preview";
    let empty_indexes = [0; 4];
    let charstrings_offset =
        u8::try_from(header.len() + name.len() + 7 + empty_indexes.len()).unwrap();
    let top_dict = [0, 1, 1, 1, 3, 139 + charstrings_offset, 17];
    let charstrings = [
        0, 2, 1, 1, 2, 13, 14, 139, 139, 21, 239, 139, 39, 239, 139, 39, 5, 14,
    ];
    [
        header.as_slice(),
        name,
        &top_dict,
        &empty_indexes,
        &charstrings,
    ]
    .concat()
}

fn variations(axes: &[([u8; 4], [i16; 3])]) -> Vec<u8> {
    let mut table = Vec::new();
    for value in [1u16, 0, 16, 2, u16::try_from(axes.len()).unwrap(), 20, 0, 0] {
        table.extend(value.to_be_bytes());
    }
    for (tag, values) in axes {
        table.extend(tag);
        for value in values {
            table.extend((i32::from(*value) << 16).to_be_bytes());
        }
        table.extend([0, 0, 0, 0]);
    }
    table
}

/// Place the test tables after a sorted OpenType directory.
pub(super) fn sfnt(format: SfntFormat, mut tables: Vec<([u8; 4], Vec<u8>)>) -> Vec<u8> {
    tables.sort_by_key(|(tag, _)| *tag);
    let count = u16::try_from(tables.len()).unwrap();
    let mut directory = Vec::from(match format {
        SfntFormat::TrueType => [0, 1, 0, 0],
        SfntFormat::Cff => *b"OTTO",
    });
    directory.extend(count.to_be_bytes());
    let entry_selector = u16::try_from(count.ilog2()).unwrap();
    let search_range = 16u16 << entry_selector;
    directory.extend(search_range.to_be_bytes());
    directory.extend(entry_selector.to_be_bytes());
    directory.extend((count * 16 - search_range).to_be_bytes());
    let directory_length = directory.len() + tables.len() * 16;
    let mut body = Vec::new();
    for (tag, table) in tables {
        directory.extend(tag);
        directory.extend([0; 4]);
        directory.extend(
            u32::try_from(directory_length + body.len())
                .unwrap()
                .to_be_bytes(),
        );
        directory.extend(u32::try_from(table.len()).unwrap().to_be_bytes());
        body.extend(table);
        body.resize(body.len().next_multiple_of(4), 0);
    }
    directory.extend(body);
    directory
}

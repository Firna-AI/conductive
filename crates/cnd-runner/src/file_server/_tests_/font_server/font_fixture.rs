//! Small OpenType directories and metadata tables for stylesheet tests.

/// An sfnt font with the names, width class, selection flags, and variation axes supplied.
pub(super) fn font(
    families: &[(u16, &str)],
    weight: u16,
    width: u16,
    selection: u16,
    axes: &[([u8; 4], [i16; 3])],
) -> Vec<u8> {
    let mut metrics = vec![0; 96];
    metrics[0..2].copy_from_slice(&4u16.to_be_bytes());
    metrics[4..6].copy_from_slice(&weight.to_be_bytes());
    metrics[6..8].copy_from_slice(&width.to_be_bytes());
    metrics[62..64].copy_from_slice(&selection.to_be_bytes());
    let mut tables = vec![(*b"OS/2", metrics), (*b"name", names(families))];
    if !axes.is_empty() {
        tables.push((*b"fvar", variations(axes)));
    }
    sfnt(tables)
}

/// An sfnt font with one regular family.
pub(super) fn regular(family: &str) -> Vec<u8> {
    font(&[(1, family)], 400, 5, 0, &[])
}

/// Encode naming records as Unicode strings in separate language slots.
pub(super) fn names(families: &[(u16, &str)]) -> Vec<u8> {
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
pub(super) fn sfnt(mut tables: Vec<([u8; 4], Vec<u8>)>) -> Vec<u8> {
    tables.sort_by_key(|(tag, _)| *tag);
    let count = u16::try_from(tables.len()).unwrap();
    let mut directory = vec![0, 1, 0, 0];
    directory.extend(count.to_be_bytes());
    directory.extend([0; 6]);
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

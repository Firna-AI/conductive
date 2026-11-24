//! Font family names and CSS descriptors from the selected OpenType tables.

use std::collections::BTreeSet;
use std::fmt::Write;
use std::path::Path;

use ttf_parser::{PlatformId, Style, Width, fvar, name, name_id, os2};

use super::font_tables::FontTables;
use super::path;

const FAMILY_LIMIT: usize = 256;

/// Metadata used to generate a rule for each family of one face.
pub(super) struct FontFace {
    families: BTreeSet<String>,
    weight: (f32, f32),
    width: (f32, f32),
    style: Style,
}

impl FontFace {
    /// Get the distinct family names, static descriptors, and available axis ranges.
    pub(super) fn parse(tables: FontTables) -> Option<Self> {
        let families = family_names(tables.names)?;
        if families.is_empty() {
            return None;
        }
        let metrics = os2::Table::parse(&tables.metrics)?;
        let weight = f32::from(metrics.weight().to_number().clamp(1, 1000));
        let width = width_percent(metrics.width());
        let mut face = Self {
            families,
            weight: (weight, weight),
            width: (width, width),
            style: metrics.style(),
        };
        if let Some(bytes) = tables.variations.as_deref() {
            for axis in fvar::Table::parse(bytes)?.axes {
                match &axis.tag.to_bytes() {
                    b"wght" => {
                        face.weight = (
                            axis.min_value.clamp(1.0, 1000.0),
                            axis.max_value.clamp(1.0, 1000.0),
                        )
                    }
                    b"wdth" => face.width = (axis.min_value.max(0.0), axis.max_value.max(0.0)),
                    _ => {}
                }
            }
        }
        Some(face)
    }

    /// Write CSS rules for this face at its requested address.
    pub(super) fn rules(&self, file: &Path) -> Option<String> {
        let mut css = String::new();
        let address = css_string(&path::address(file)?);
        let weight = css_range(self.weight, "");
        let width = css_range(self.width, "%");
        let style = match self.style {
            Style::Normal => "normal",
            Style::Italic => "italic",
            Style::Oblique => "oblique",
        };
        for family in &self.families {
            let family = css_string(family);
            writeln!(css, "@font-face {{ font-family: {family}; font-weight: {weight}; font-style: {style}; font-stretch: {width}; src: url({address}); }}").ok()?;
        }
        Some(css)
    }
}

/// Both naming table formats have the same record layout and storage offset.
/// Treat format 1 as format 0 because the language tags are not used here.
fn family_names(mut bytes: Vec<u8>) -> Option<BTreeSet<String>> {
    if bytes.starts_with(&[0, 1]) {
        bytes[1] = 0;
    }
    let names = name::Table::parse(&bytes)?.names;
    Some(
        (0..names.len())
            .filter_map(|index| names.get(index))
            .filter(|record| {
                matches!(
                    record.name_id,
                    name_id::FAMILY | name_id::TYPOGRAPHIC_FAMILY
                )
            })
            .filter(|record| !record.name.is_empty() && record.name.len() <= FAMILY_LIMIT * 4)
            .filter_map(decode_name)
            .filter(|family| !family.is_empty() && family.chars().count() <= FAMILY_LIMIT)
            .collect(),
    )
}

fn decode_name(record: name::Name<'_>) -> Option<String> {
    let encoding = (record.platform_id, record.encoding_id);
    if record.is_unicode() || matches!(encoding, (PlatformId::Windows, 10) | (PlatformId::Iso, 1)) {
        let (pairs, remaining) = record.name.as_chunks::<2>();
        if !remaining.is_empty() {
            return None;
        }
        return char::decode_utf16(pairs.iter().copied().map(u16::from_be_bytes))
            .collect::<Result<_, _>>()
            .ok();
    }
    match encoding {
        (PlatformId::Macintosh, 0) => decode_mac_roman(record.name),
        _ => std::str::from_utf8(record.name)
            .ok()
            .filter(|text| text.is_ascii())
            .map(str::to_owned),
    }
}

fn decode_mac_roman(bytes: &[u8]) -> Option<String> {
    const HIGH_BYTES: &str = "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ";
    bytes
        .iter()
        .map(|&byte| {
            if byte.is_ascii() {
                Some(char::from(byte))
            } else {
                HIGH_BYTES.chars().nth(usize::from(byte - 128))
            }
        })
        .collect()
}

fn width_percent(width: Width) -> f32 {
    match width {
        Width::UltraCondensed => 50.0,
        Width::ExtraCondensed => 62.5,
        Width::Condensed => 75.0,
        Width::SemiCondensed => 87.5,
        Width::Normal => 100.0,
        Width::SemiExpanded => 112.5,
        Width::Expanded => 125.0,
        Width::ExtraExpanded => 150.0,
        Width::UltraExpanded => 200.0,
    }
}

fn css_range((min, max): (f32, f32), unit: &str) -> String {
    if min == max {
        format!("{min}{unit}")
    } else {
        format!("{min}{unit} {max}{unit}")
    }
}

/// Serialize a CSSOM string including its quotes.
fn css_string(value: &str) -> String {
    let mut css = String::with_capacity(value.len() + 2);
    css.push('"');
    for character in value.chars() {
        match character {
            '\0' => css.push('\u{fffd}'),
            '\u{1}'..='\u{1f}' | '\u{7f}' => {
                let _ = write!(css, "\\{:x} ", u32::from(character));
            }
            '"' | '\\' => {
                css.push('\\');
                css.push(character);
            }
            _ => css.push(character),
        }
    }
    css.push('"');
    css
}

//! In-memory cache of font rules and the generated stylesheet.

use std::collections::BTreeMap;
use std::path::PathBuf;

use super::files::{FileVersion, FontStylesheet};
use super::font_face::FontFace;
use super::font_files::FontFolders;
use super::font_tables::FontTables;

/// Reserved address for the generated system font stylesheet.
pub(super) const ADDRESS: &str = "/__conductive/system-fonts.css";

struct CachedFont {
    version: FileVersion,
    rules: Option<String>,
}

/// Reuses the rules of files whose descriptor metadata stays the same.
#[derive(Default)]
pub(super) struct StylesheetCache {
    fonts: BTreeMap<PathBuf, CachedFont>,
    stylesheet: FontStylesheet,
}

impl StylesheetCache {
    /// Refresh the sorted font rules and remove rules for files that disappeared.
    pub(super) fn refresh(&mut self, folders: &FontFolders) -> FontStylesheet {
        let mut fonts = BTreeMap::new();
        let mut changed = false;
        for path in folders.faces() {
            let Some((file, metadata)) = folders.open(&path) else {
                continue;
            };
            let version = FileVersion::from(&metadata);
            let entry = match self.fonts.remove(&path) {
                Some(cached) if cached.version == version => cached,
                _ => {
                    changed = true;
                    let rules = FontTables::read(&file, metadata.len())
                        .and_then(FontFace::parse)
                        .and_then(|face| face.rules(&path));
                    CachedFont { version, rules }
                }
            };
            fonts.insert(path, entry);
        }
        if changed || !self.fonts.is_empty() {
            self.stylesheet = FontStylesheet::new(
                fonts
                    .values()
                    .filter_map(|font| font.rules.as_deref())
                    .collect(),
            );
        }
        self.fonts = fonts;
        self.stylesheet.clone()
    }
}

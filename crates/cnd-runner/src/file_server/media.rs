//! Fixed web media types, independent of content and case.

/// Media type for changed HTML pages.
pub(super) const HTML: &str = "text/html; charset=utf-8";
/// Media type for changed stylesheets.
pub(super) const CSS: &str = "text/css; charset=utf-8";
/// Media type for changed SVG documents.
pub(super) const SVG: &str = "image/svg+xml; charset=utf-8";

/// Find the media type for the requested file extension.
pub(super) fn content_type(path: &str) -> &'static str {
    let extension = path
        .rsplit_once('.')
        .map(|(_, value)| value.to_ascii_lowercase());
    match extension.as_deref() {
        Some("html" | "htm") => HTML,
        Some("css") => CSS,
        Some("js" | "mjs") => "text/javascript; charset=utf-8",
        Some("json" | "map") => "application/json; charset=utf-8",
        Some("svg") => SVG,
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("avif") => "image/avif",
        Some("ico") => "image/x-icon",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("ttf") => "font/ttf",
        Some("otf") => "font/otf",
        Some("wasm") => "application/wasm",
        Some("mp4") => "video/mp4",
        Some("webm") => "video/webm",
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("txt") => "text/plain; charset=utf-8",
        Some("md" | "markdown") => "text/markdown; charset=utf-8",
        Some("xml") => "application/xml; charset=utf-8",
        Some("pdf") => "application/pdf",
        _ => "application/octet-stream",
    }
}

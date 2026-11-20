//! Output filtering keeps split, overlapping, and binary stream content safe.

use crate::secrets::filter::Filter;

#[test]
fn hides_exact_values_at_every_chunk_boundary_and_keeps_other_bytes() {
    let mut prompt = Filter::new([b"token-value".to_vec()].into_iter());
    assert_eq!(prompt.push(b"prompt> ", false), b"prompt> ");
    let source = b"before token-value after\xff\n";
    for split in 0..=source.len() {
        let mut filter = Filter::new([b"token-value".to_vec()].into_iter());
        let mut output = filter.push(&source[..split], false);
        output.extend(filter.push(&source[split..], false));
        output.extend(filter.push(&[], true));
        assert_eq!(output, b"before [redacted] after\xff\n", "split {split}");
    }
}

#[test]
fn hides_overlapping_values_and_flushes_incomplete_prefixes() {
    let values = [
        b"abab".to_vec(),
        b"bab".to_vec(),
        b"".to_vec(),
        "\u{1f9ed}key".as_bytes().to_vec(),
    ];
    let mut filter = Filter::new(values.into_iter());
    let mut output = Vec::new();
    for byte in "ababab \u{1f9ed}key aba".as_bytes() {
        output.extend(filter.push(&[*byte], false));
    }
    output.extend(filter.push(&[], true));
    assert_eq!(output, b"[redacted] [redacted] aba");
}

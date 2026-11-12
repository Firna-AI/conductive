//! The parts boundary refuses unsupported or unverifiable downloads.

#![expect(
    clippy::unwrap_used,
    reason = "A failed test setup must stop the test."
)]

use crate::error::Error;
use crate::parts::{Part, PartsList};

#[test]
fn parts_require_a_supported_schema_unique_roles_and_verifiable_https_downloads() {
    let part = Part {
        name: "runner".to_owned(),
        url: "https://runner.conductive.build/runner.tar.gz".to_owned(),
        sha256: "a".repeat(64),
    };
    let mut list = PartsList::new(vec![part.clone()]).unwrap();
    list.schema_version = 2;
    assert!(matches!(
        list.validate(),
        Err(Error::UnsupportedSchema { version: 2 })
    ));
    assert!(
        matches!(PartsList::new(vec![part.clone(), part.clone()]), Err(Error::InvalidPart { name }) if name == "runner")
    );
    let mut invalid = part.clone();
    invalid.sha256.clear();
    assert!(
        matches!(PartsList::new(vec![invalid]), Err(Error::InvalidPart { name }) if name == "runner")
    );
    let mut invalid = part;
    invalid.url = "http://runner.conductive.build/runner.tar.gz".to_owned();
    assert!(
        matches!(PartsList::new(vec![invalid]), Err(Error::InvalidPart { name }) if name == "runner")
    );
}

//! Metadata trust and current alias behavior through the public identity reader.

use std::collections::BTreeMap;
use std::sync::Arc;

use cnd_runner_interface::preview_ingress::PreviewIngressIdentity;
use unimock::{MockFn, Unimock};

use crate::ingress::{Ingress, IngressIdentity, IngressReader};
use crate::ingress_file::{IngressFile, IngressFilesMock};

fn contents(bytes: &[u8], uid: u32, mode: u32, regular: bool) -> IngressFile {
    IngressFile::Contents {
        bytes: bytes.to_vec(),
        uid,
        mode,
        regular,
    }
}

fn identity(alias: u16) -> IngressIdentity {
    IngressIdentity::Current(PreviewIngressIdentity {
        sandbox_id: "sandbox-one".into(),
        domain: "eu.e2b.test".into(),
        aliases: BTreeMap::from([("7682".into(), alias)]),
    })
}

#[tokio::test]
async fn reads_current_metadata_after_missing_file_and_alias_change() {
    let first = br#"{"sandboxId":"sandbox-one","domain":"eu.e2b.test","aliases":{"7682":41235}}"#;
    let changed = br#"{"sandboxId":"sandbox-one","domain":"eu.e2b.test","aliases":{"7682":41236}}"#;
    let reader = IngressReader {
        files: Arc::new(Unimock::new(IngressFilesMock::read.stub(|each| {
            each.call(unimock::matching!())
                .returns(IngressFile::Missing)
                .once()
                .then()
                .returns(contents(first, 0, 0o444, true))
                .once()
                .then()
                .returns(contents(changed, 0, 0o444, true));
        }))),
    };
    assert_eq!(reader.read().await, IngressIdentity::Missing);
    assert_eq!(reader.read().await, identity(41235));
    assert_eq!(reader.read().await, identity(41236));
}

#[tokio::test]
async fn refuses_untrusted_metadata_without_using_a_boat_fallback() {
    let valid = br#"{"sandboxId":"sandbox-one","domain":"eu.e2b.test","aliases":{"7682":41235}}"#;
    let domain =
        br#"{"sandboxId":"sandbox-one","domain":"other.test/path","aliases":{"7682":41235}}"#;
    for file in [
        contents(valid, 1000, 0o444, true),
        contents(valid, 0, 0o666, true),
        contents(valid, 0, 0o444, false),
        contents(&vec![0; 1025], 0, 0o444, true),
        contents(b"{invalid", 0, 0o444, true),
        contents(domain, 0, 0o444, true),
    ] {
        let reader = IngressReader {
            files: Arc::new(Unimock::new(
                IngressFilesMock::read
                    .some_call(unimock::matching!())
                    .returns(file),
            )),
        };
        assert_eq!(reader.read().await, IngressIdentity::Untrusted);
    }
}

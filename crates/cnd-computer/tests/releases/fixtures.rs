//! Fixtures with the same manifest keys and signed bytes as release publication.

use std::collections::HashMap;

use cnd_release::container_base::{
    ContainerBaseArchive, ContainerBaseManifest, ContainerBaseRelease, container_base_archive_key,
    container_base_manifest_key, container_base_signature_key,
};
use cnd_release::files::sha256;
use cnd_release::signature::ReleaseSigner;
use cnd_runner_interface::computer::operations::ComputerRelease;
use tokio::task::JoinHandle;

use crate::support;

pub(super) type Responses = HashMap<String, (u16, Vec<u8>)>;
pub(super) const VERSION: &str = "0.0.42";

pub(super) fn signer() -> ReleaseSigner {
    ReleaseSigner::from_pem(include_str!(
        "../../../cnd-release/tests/fixtures/rfc8032-test-key.pem"
    ))
    .unwrap()
}

pub(super) async fn serve(responses: Responses, count: usize) -> (String, JoinHandle<Vec<String>>) {
    support::http(
        move |request| {
            let path = request
                .split_ascii_whitespace()
                .nth(1)
                .unwrap()
                .trim_start_matches('/');
            responses.get(path).cloned().unwrap_or((404, Vec::new()))
        },
        count,
    )
    .await
}

pub(super) struct Base {
    pub(super) identity: ComputerRelease,
    pub(super) files: Responses,
    pub(super) archive: Vec<u8>,
    pub(super) archive_key: String,
    pub(super) signature_key: String,
    pub(super) id: String,
}

pub(super) fn base(signer: &ReleaseSigner) -> Base {
    let identity = ComputerRelease {
        version: VERSION.into(),
        digest: "a".repeat(64),
    };
    let archive = vec![0x7b; 512 * 1024];
    let manifest = ContainerBaseManifest {
        schema_version: 1,
        release: ContainerBaseRelease {
            version: VERSION.into(),
            digest: identity.digest.clone(),
        },
        archive: ContainerBaseArchive {
            sha256: sha256(&archive),
            size: archive.len() as u64,
        },
        image_id: format!("sha256:{}", "b".repeat(64)),
    };
    let mut manifest_bytes = serde_json::to_vec_pretty(&manifest).unwrap();
    manifest_bytes.push(b'\n');
    let signature_key = container_base_signature_key(&manifest_bytes);
    let signature = signer.sign(&manifest_bytes).unwrap();
    let archive_key = container_base_archive_key(VERSION, &manifest.archive.sha256).unwrap();
    let files = Responses::from([
        (
            container_base_manifest_key(VERSION, &identity.digest).unwrap(),
            (200, manifest_bytes),
        ),
        (signature_key.clone(), (200, signature.to_vec())),
        (archive_key.clone(), (200, archive.clone())),
    ]);
    Base {
        identity,
        files,
        archive,
        archive_key,
        signature_key,
        id: manifest.image_id,
    }
}

//! Program downloads verify both the exact manifest and its archive.

use std::fs;
use std::os::unix::fs::PermissionsExt;

use cnd_computer::error::Error;
use cnd_computer::releases::http::HttpReleases;
use cnd_computer::releases::ports::Releases;
use cnd_release::files::sha256;
use cnd_release::manifest::{program_archive_key, release_manifest_bytes};
use cnd_release::signature::{ReleaseSigner, manifest_signature_key};
use cnd_release::version::LATEST_KEY;
use cnd_runner_interface::computer::operations::ComputerRelease;
use flate2::Compression;
use flate2::write::GzEncoder;

use super::fixtures::{Responses, VERSION, serve, signer};

const PROGRAM: &[u8] = b"fixture program";

fn archive() -> Vec<u8> {
    let mut tar = tar::Builder::new(GzEncoder::new(Vec::new(), Compression::default()));
    let mut header = tar::Header::new_gnu();
    header.set_size(PROGRAM.len() as u64);
    header.set_mode(0o755);
    header.set_cksum();
    tar.append_data(&mut header, "conductive", PROGRAM).unwrap();
    tar.into_inner().unwrap().finish().unwrap()
}

fn signed(signer: &ReleaseSigner) -> (ComputerRelease, Responses, String, String) {
    let archive = archive();
    let release = ComputerRelease {
        version: VERSION.into(),
        digest: sha256(&archive),
    };
    let manifest = release_manifest_bytes(VERSION, &release.digest).unwrap();
    let signature_key = manifest_signature_key(&manifest);
    let archive_key = program_archive_key(VERSION, &release.digest).unwrap();
    let responses = Responses::from([
        (
            signature_key.clone(),
            (200, signer.sign(&manifest).unwrap().to_vec()),
        ),
        (archive_key.clone(), (200, archive)),
    ]);
    (release, responses, signature_key, archive_key)
}

#[tokio::test]
async fn signed_program_is_extracted_and_archive_reused_from_cache() {
    let signer = signer();
    let cache = tempfile::tempdir().unwrap();
    let (release, responses, signature_key, archive_key) = signed(&signer);
    let (server, wire) = serve(responses, 3).await;
    let reader = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
    let server = server.parse().unwrap();
    let first = reader.program(&server, &release).await;
    assert!(first.is_ok(), "{first:?}");
    let path = first.unwrap();
    assert_eq!(
        path,
        cache
            .path()
            .join("programs")
            .join(VERSION)
            .join(&release.digest)
            .join("conductive")
    );
    assert_eq!(fs::read(&path).unwrap(), PROGRAM);
    assert_eq!(
        fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o755
    );
    assert_eq!(reader.program(&server, &release).await.unwrap(), path);
    let requests = wire.await.unwrap();
    assert!(requests[0].starts_with(&format!("GET /{signature_key} ")));
    assert!(requests[1].starts_with(&format!("GET /{archive_key} ")));
    assert!(requests[2].starts_with(&format!("GET /{signature_key} ")));
}

#[tokio::test]
async fn missing_and_wrong_signatures_and_wrong_program_digests_are_invalid() {
    let signer = signer();
    for failure in ["missing", "gone", "signature", "digest", "status"] {
        let cache = tempfile::tempdir().unwrap();
        let (release, mut responses, signature_key, archive_key) = signed(&signer);
        let count = match failure {
            "missing" => {
                responses.remove(&signature_key);
                1
            }
            "gone" => {
                responses.insert(signature_key, (410, Vec::new()));
                1
            }
            "signature" => {
                responses.insert(signature_key, (200, vec![0; 64]));
                1
            }
            "digest" => {
                responses.insert(archive_key, (200, b"wrong digest".to_vec()));
                2
            }
            _ => {
                responses.insert(signature_key, (503, b"private server message".to_vec()));
                1
            }
        };
        let (server, wire) = serve(responses, count).await;
        let reader = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
        let result = reader.program(&server.parse().unwrap(), &release).await;
        assert!(
            (failure == "status" && matches!(result, Err(Error::ReleaseUnavailable)))
                || (failure != "status" && matches!(result, Err(Error::ReleaseInvalid))),
            "{failure}: {result:?}"
        );
        assert_eq!(fs::read_dir(cache.path()).unwrap().count(), 0);
        assert_eq!(wire.await.unwrap().len(), count);
    }
}

#[tokio::test]
async fn newest_version_signature_covers_the_exact_document_bytes() {
    let signer = signer();
    let cache = tempfile::tempdir().unwrap();
    let (release, mut responses, signature_key, archive_key) = signed(&signer);
    let mut exact = release_manifest_bytes(VERSION, &release.digest).unwrap();
    exact.extend(b"\n ");
    responses.remove(&signature_key);
    responses.insert(
        manifest_signature_key(&exact),
        (200, signer.sign(&exact).unwrap().to_vec()),
    );
    responses.insert(LATEST_KEY.into(), (200, exact));
    let (server, wire) = serve(responses, 3).await;
    let reader = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
    let server = server.parse().unwrap();
    let verified = reader.latest(&server).await;
    assert!(verified.is_ok(), "{verified:?}");
    let verified = verified.unwrap();
    assert_eq!(verified.identity(), &release);
    let executable = reader.verified_program(&server, &verified).await.unwrap();
    assert_eq!(fs::read(executable).unwrap(), PROGRAM);
    assert!(wire.await.unwrap()[2].starts_with(&format!("GET /{archive_key} ")));
}

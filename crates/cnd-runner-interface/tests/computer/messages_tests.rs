//! Both directions of the computer text protocol and enrollment.

use cnd_runner_interface::computer::enrollment::ComputerEnrollment;
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};

computer_wire!(
    hello,
    ComputerToWorker,
    r#"{"type":"hello","computerProtocolVersion":1,"programVersion":"0.0.42","resources":{"cpus":16,"memoryBytes":9007199254740991,"system":"Linux x86_64"}}"#
);
computer_wire!(
    hello_future_version,
    ComputerToWorker,
    r#"{"type":"hello","computerProtocolVersion":4294967295,"programVersion":"0.0.99","resources":{"cpus":4,"memoryBytes":8589934592,"system":"Linux x86_64"}}"#
);
computer_wire!(ping, ComputerToWorker, r#"{"type":"ping"}"#);
computer_wire!(
    reply,
    ComputerToWorker,
    r#"{"type":"reply","requestId":4294967295,"result":{"kind":"container","container":"workspace-1","state":"running"}}"#
);
computer_wire!(
    welcome,
    WorkerToComputer,
    r#"{"type":"welcome","computerProtocolVersion":1}"#
);
computer_wire!(pong, WorkerToComputer, r#"{"type":"pong"}"#);
computer_wire!(
    request,
    WorkerToComputer,
    r#"{"type":"request","requestId":1,"operation":{"kind":"container.get","container":"workspace-1"}}"#
);
computer_wire!(
    enrollment,
    ComputerEnrollment,
    r#"{"computerToken":"<redacted>"}"#
);

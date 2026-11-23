//! Both directions of the host text protocol.

use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};

host_wire!(
    hello,
    HostToWorker,
    r#"{"type":"hello","hostProtocolVersion":1,"programVersion":"0.0.42"}"#
);
host_wire!(
    hello_future_version,
    HostToWorker,
    r#"{"type":"hello","hostProtocolVersion":7,"programVersion":"0.0.99"}"#
);
host_wire!(ping, HostToWorker, r#"{"type":"ping"}"#);
host_wire!(
    reply,
    HostToWorker,
    r#"{"type":"reply","requestId":16909060,"result":{"kind":"stream.opened","streamId":9}}"#
);
host_wire!(
    host_stream_end,
    HostToWorker,
    r#"{"type":"stream.end","streamId":9}"#
);
host_wire!(
    host_stream_close,
    HostToWorker,
    r#"{"type":"stream.close","streamId":9}"#
);
host_wire!(
    host_stream_credit,
    HostToWorker,
    r#"{"type":"stream.credit","streamId":9,"bytes":65536}"#
);
host_wire!(
    welcome,
    WorkerToHost,
    r#"{"type":"welcome","hostProtocolVersion":1}"#
);
host_wire!(pong, WorkerToHost, r#"{"type":"pong"}"#);
host_wire!(
    request,
    WorkerToHost,
    r#"{"type":"request","requestId":16909060,"operation":{"kind":"file.info","path":"/home/user/file.txt"}}"#
);
host_wire!(
    worker_stream_end,
    WorkerToHost,
    r#"{"type":"stream.end","streamId":9}"#
);
host_wire!(
    worker_stream_close,
    WorkerToHost,
    r#"{"type":"stream.close","streamId":9}"#
);
host_wire!(
    worker_stream_credit,
    WorkerToHost,
    r#"{"type":"stream.credit","streamId":9,"bytes":65536}"#
);

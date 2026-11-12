FROM ubuntu:24.04

USER root
COPY install-base.sh install-tools.sh install-runtime.sh runtime-settings.sh port-relay.py port-relay.service /opt/conductive-e2b-build/
RUN sh /opt/conductive-e2b-build/install-base.sh && rm -rf /opt/conductive-e2b-build

USER user
WORKDIR /home/user

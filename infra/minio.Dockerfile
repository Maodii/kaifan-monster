FROM public.ecr.aws/docker/library/debian:bookworm-slim@sha256:99c0b25c46d0214d5a2091092e7908907dcaecd6a962cde0ac700acee222b6f3
COPY minio /usr/local/bin/minio
RUN chmod 755 /usr/local/bin/minio && mkdir -p /data && chown 1000:1000 /data
USER 1000:1000
EXPOSE 9000 9001
ENTRYPOINT ["/usr/local/bin/minio"]

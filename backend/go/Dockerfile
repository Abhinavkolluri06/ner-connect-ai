FROM golang:1.26-bookworm AS build
WORKDIR /src
COPY backend/go/go.mod backend/go/go.sum ./
RUN go mod download
COPY backend/go/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/* && useradd --uid 10001 --create-home app
WORKDIR /app
RUN mkdir /data && chown app:app /data
COPY --from=build /out/server /app/server
USER 10001:10001
ENV GO_HOST=0.0.0.0 GO_PORT=8080 DATA_PATH=/data/ner-connect.db
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -q -O /dev/null http://127.0.0.1:8080/health/ready || exit 1
ENTRYPOINT ["/app/server"]

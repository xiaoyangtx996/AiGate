FROM golang:1.26-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/api ./cmd/api \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/gateway ./cmd/gateway \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/worker ./cmd/worker

FROM alpine:3.22

RUN apk add --no-cache ca-certificates wget \
    && addgroup -S aigate \
    && adduser -S -G aigate aigate
WORKDIR /app
COPY --from=build /out/api /out/gateway /out/worker /usr/local/bin/
RUN mkdir -p /app/data/objects && chown -R aigate:aigate /app
USER aigate
CMD ["api"]

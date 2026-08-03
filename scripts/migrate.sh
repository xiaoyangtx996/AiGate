#!/bin/sh
set -eu

docker compose run --rm migrate
docker compose run --rm bootstrap

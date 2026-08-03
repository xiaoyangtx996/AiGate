$ErrorActionPreference = 'Stop'

docker compose run --rm migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose run --rm bootstrap
exit $LASTEXITCODE

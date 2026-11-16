#!/usr/bin/env bash
# NOVAWORKS release manager
#
# Commands:
#   deploy  v1.2.4             Clone/pull, build, and test a release
#   deploy  v1.2.4 --activate  Build, test, and switch production
#   switch  v1.2.3             Test and activate an already-built release
#   rollback                   Switch back to the previously active image
#   status                     Show production, candidate, releases, and disk
#   list                       List locally built release images
#   cleanup-test               Remove the temporary candidate container

set -Eeuo pipefail

readonly REPOSITORY_URL="${NOVAWORKS_REPOSITORY_URL:-git@github.com:Isabih/novaworks-production.git}"
readonly RELEASE_ROOT="${NOVAWORKS_RELEASE_ROOT:-/opt/novaworks-releases}"
readonly STACK_ROOT="${NOVAWORKS_STACK_ROOT:-/opt/web-runtime}"
readonly RUNTIME_DIR="${NOVAWORKS_RUNTIME_DIR:-/opt/web-runtime/runtime}"
readonly ENV_FILE="${NOVAWORKS_ENV_FILE:-/opt/web-runtime/runtime/.env}"
readonly DOCKERFILE="${NOVAWORKS_DOCKERFILE:-/opt/web-runtime/Dockerfile}"
readonly PRODUCTION_CONTAINER="${NOVAWORKS_PRODUCTION_CONTAINER:-web-runtime}"
readonly CANDIDATE_CONTAINER="${NOVAWORKS_CANDIDATE_CONTAINER:-web-runtime-candidate}"
readonly PRODUCTION_PORT="${NOVAWORKS_PRODUCTION_PORT:-3004}"
readonly TEST_PORT="${NOVAWORKS_TEST_PORT:-3015}"
readonly CONTAINER_PORT="${NOVAWORKS_CONTAINER_PORT:-3004}"
readonly DOCKER_NETWORK="${NOVAWORKS_DOCKER_NETWORK:-web-runtime-stack_default}"
readonly IMAGE_REPOSITORY="${NOVAWORKS_IMAGE_REPOSITORY:-novaworks-runtime}"
readonly STATE_DIR="${NOVAWORKS_STATE_DIR:-/opt/web-runtime/release-manager}"
readonly ACTIVE_IMAGE_FILE="$STATE_DIR/active-image"
readonly ACTIVE_RELEASE_FILE="$STATE_DIR/active-release"
readonly PREVIOUS_IMAGE_FILE="$STATE_DIR/previous-image"
readonly PREVIOUS_RELEASE_FILE="$STATE_DIR/previous-release"

log() { printf '[NOVAWORKS] %s\n' "$*"; }
die() { printf '[NOVAWORKS] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
}

require_root() {
  [[ ${EUID:-$(id -u)} -eq 0 ]] || die "Run with sudo: sudo $0 $*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command is missing: $1"
}

validate_release() {
  [[ "$1" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([._-][A-Za-z0-9._-]+)?$ ]] ||
    die "Invalid release '$1'. Expected a tag such as v1.2.4"
}

image_for_release() {
  printf '%s:%s\n' "$IMAGE_REPOSITORY" "$1"
}

preflight() {
  local command_name="$1"
  require_root "$command_name"
  for executable in docker git rsync curl awk grep sed ss; do
    require_command "$executable"
  done
  docker info >/dev/null 2>&1 || die "Docker is not available"
  [[ -f "$ENV_FILE" ]] || die "Environment file not found: $ENV_FILE"
  [[ -f "$DOCKERFILE" ]] || die "Dockerfile not found: $DOCKERFILE"
  install -d -m 0755 "$RELEASE_ROOT" "$STATE_DIR"
}

check_free_space() {
  local available_kb
  available_kb=$(df -Pk / | awk 'NR==2 {print $4}')
  (( available_kb >= 2097152 )) ||
    die "Less than 2 GiB is free. Clean the disk before building."
}

fetch_release() {
  local release="$1"
  local release_dir="$RELEASE_ROOT/$release"

  if [[ -d "$release_dir/.git" ]]; then
    log "Refreshing existing release $release"
    git -C "$release_dir" fetch --depth 1 origin "refs/tags/$release:refs/tags/$release"
    git -C "$release_dir" checkout --detach --force "$release"
    git -C "$release_dir" clean -fd -e .env
  elif [[ -e "$release_dir" ]]; then
    die "$release_dir exists but is not a Git checkout"
  else
    log "Cloning release $release"
    git clone --branch "$release" --depth 1 "$REPOSITORY_URL" "$release_dir"
  fi

  [[ -f "$release_dir/package.json" ]] || die "Release has no package.json"
  [[ -f "$release_dir/pnpm-lock.yaml" ]] || die "Release has no pnpm-lock.yaml"
}

ensure_node_server_preset() {
  local config="$RUNTIME_DIR/vite.config.ts"
  local temporary="$RUNTIME_DIR/.vite.config.ts.release-manager"

  [[ -f "$config" ]] || die "vite.config.ts not found in staged release"
  if grep -Eq "preset:[[:space:]]*['\"]node-server['\"]" "$config"; then
    return
  fi
  if grep -Eq '^[[:space:]]*nitro:[[:space:]]*\{' "$config"; then
    die "vite.config.ts has a Nitro configuration but not preset node-server; review it manually"
  fi

  log "Adding the required Nitro node-server preset to the staged server build"
  awk '
    !inserted && /export default defineConfig\(\{/ {
      print
      print "  nitro: {"
      print "    preset: \"node-server\","
      print "  },"
      inserted=1
      next
    }
    { print }
    END { if (!inserted) exit 42 }
  ' "$config" > "$temporary" || {
    rm -f "$temporary"
    die "Could not add node-server preset to vite.config.ts"
  }
  mv "$temporary" "$config"
}

stage_release() {
  local release="$1"
  local release_dir="$RELEASE_ROOT/$release"

  log "Staging $release in $RUNTIME_DIR"
  rsync -a --delete \
    --exclude='.env' \
    --exclude='.git/' \
    --exclude='node_modules/' \
    "$release_dir/" "$RUNTIME_DIR/"
  chmod 0600 "$ENV_FILE"
  ensure_node_server_preset
}

build_release() {
  local release="$1"
  local image
  image=$(image_for_release "$release")

  log "Building image $image"
  docker build --pull -f "$DOCKERFILE" -t "$image" "$STACK_ROOT"
}

remove_candidate() {
  docker rm -f "$CANDIDATE_CONTAINER" >/dev/null 2>&1 || true
}

wait_for_http() {
  local url="$1"
  local attempts="${2:-30}"
  local count
  for ((count=1; count<=attempts; count++)); do
    if curl --fail --silent --show-error --max-time 3 -o /dev/null "$url"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

container_network_arguments() {
  if docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    printf '%s\n' "--network" "$DOCKER_NETWORK"
  fi
}

test_release() {
  local release="$1"
  local image
  local -a network_arguments=()
  image=$(image_for_release "$release")
  docker image inspect "$image" >/dev/null 2>&1 || die "Image not found: $image"

  remove_candidate
  if ss -ltnH "sport = :$TEST_PORT" 2>/dev/null | grep -q .; then
    die "Test port $TEST_PORT is already occupied"
  fi
  while IFS= read -r argument; do
    network_arguments+=("$argument")
  done < <(container_network_arguments)

  log "Starting candidate $release on 127.0.0.1:$TEST_PORT"
  docker run -d \
    --name "$CANDIDATE_CONTAINER" \
    --restart no \
    --env-file "$ENV_FILE" \
    -e NODE_ENV=production \
    -e PORT="$CONTAINER_PORT" \
    --label "novaworks.release=$release" \
    -p "127.0.0.1:$TEST_PORT:$CONTAINER_PORT" \
    "${network_arguments[@]}" \
    "$image" >/dev/null

  if wait_for_http "http://127.0.0.1:$TEST_PORT/" 45; then
    log "Candidate $release passed HTTP testing"
    docker ps --filter "name=^/${CANDIDATE_CONTAINER}$" \
      --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
  else
    docker logs --tail 150 "$CANDIDATE_CONTAINER" >&2 || true
    remove_candidate
    die "Candidate $release failed HTTP testing"
  fi
}

run_production_container() {
  local release="$1"
  local image="$2"
  local -a network_arguments=()
  while IFS= read -r argument; do
    network_arguments+=("$argument")
  done < <(container_network_arguments)

  docker run -d \
    --name "$PRODUCTION_CONTAINER" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -e NODE_ENV=production \
    -e PORT="$CONTAINER_PORT" \
    --label "novaworks.release=$release" \
    -p "127.0.0.1:$PRODUCTION_PORT:$CONTAINER_PORT" \
    "${network_arguments[@]}" \
    "$image" >/dev/null
}

activate_image() {
  local release="$1"
  local image="$2"
  local current_id current_release previous_tag timestamp

  docker image inspect "$image" >/dev/null 2>&1 || die "Image not found: $image"
  current_release="legacy"

  if docker container inspect "$PRODUCTION_CONTAINER" >/dev/null 2>&1; then
    current_id=$(docker inspect --format '{{.Image}}' "$PRODUCTION_CONTAINER")
    current_release=$(docker inspect --format '{{index .Config.Labels "novaworks.release"}}' "$PRODUCTION_CONTAINER" 2>/dev/null || true)
    [[ -n "$current_release" && "$current_release" != '<no value>' ]] || current_release="legacy"
    timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    previous_tag="$IMAGE_REPOSITORY:previous-$timestamp"
    docker image tag "$current_id" "$previous_tag"
    printf '%s\n' "$previous_tag" > "$PREVIOUS_IMAGE_FILE"
    printf '%s\n' "$current_release" > "$PREVIOUS_RELEASE_FILE"
  else
    previous_tag=""
  fi

  remove_candidate
  log "Switching production from $current_release to $release"
  docker rm -f "$PRODUCTION_CONTAINER" >/dev/null 2>&1 || true
  run_production_container "$release" "$image"

  if wait_for_http "http://127.0.0.1:$PRODUCTION_PORT/" 45; then
    printf '%s\n' "$image" > "$ACTIVE_IMAGE_FILE"
    printf '%s\n' "$release" > "$ACTIVE_RELEASE_FILE"
    log "Production is healthy on $release"
    return 0
  fi

  docker logs --tail 150 "$PRODUCTION_CONTAINER" >&2 || true
  docker rm -f "$PRODUCTION_CONTAINER" >/dev/null 2>&1 || true
  if [[ -n "$previous_tag" ]]; then
    log "Activation failed; restoring $current_release"
    run_production_container "$current_release" "$previous_tag"
    wait_for_http "http://127.0.0.1:$PRODUCTION_PORT/" 45 ||
      die "New release failed and automatic rollback did not become healthy"
  fi
  die "Activation failed; the previous production image was restored"
}

deploy_release() {
  local release="$1"
  local activate_after="${2:-}"
  validate_release "$release"
  check_free_space
  fetch_release "$release"
  stage_release "$release"
  build_release "$release"
  test_release "$release"

  if find "$RELEASE_ROOT/$release/mysql/migrations" -maxdepth 1 -type f -name '*.sql' -print -quit 2>/dev/null | grep -q .; then
    log "Database migration files exist. Review/back up/apply them separately before activation."
  fi
  if [[ "$activate_after" == "--activate" ]]; then
    activate_image "$release" "$(image_for_release "$release")"
  else
    log "Ready. Activate with: sudo $0 switch $release"
  fi
}

switch_release() {
  local release="$1"
  validate_release "$release"
  test_release "$release"
  activate_image "$release" "$(image_for_release "$release")"
}

rollback_release() {
  local previous_image previous_release
  [[ -s "$PREVIOUS_IMAGE_FILE" ]] || die "No previous image is recorded"
  previous_image=$(<"$PREVIOUS_IMAGE_FILE")
  previous_release="previous"
  [[ -s "$PREVIOUS_RELEASE_FILE" ]] && previous_release=$(<"$PREVIOUS_RELEASE_FILE")
  activate_image "$previous_release" "$previous_image"
}

show_status() {
  printf '\nProduction\n'
  docker ps -a --filter "name=^/${PRODUCTION_CONTAINER}$" \
    --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
  printf '\nCandidate\n'
  docker ps -a --filter "name=^/${CANDIDATE_CONTAINER}$" \
    --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
  printf '\nSaved state\n'
  [[ -s "$ACTIVE_RELEASE_FILE" ]] && printf 'Active release:   %s\n' "$(<"$ACTIVE_RELEASE_FILE")" || true
  [[ -s "$PREVIOUS_RELEASE_FILE" ]] && printf 'Previous release: %s\n' "$(<"$PREVIOUS_RELEASE_FILE")" || true
  printf '\nDisk\n'
  df -h /
}

list_images() {
  docker image ls "$IMAGE_REPOSITORY" \
    --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedSince}}'
}

main() {
  local command_name="${1:-help}"
  case "$command_name" in
    deploy)
      [[ $# -eq 2 || $# -eq 3 ]] || die "Usage: $0 deploy v1.2.4 [--activate]"
      [[ $# -eq 2 || "$3" == "--activate" ]] || die "Unknown deploy option: $3"
      preflight "$command_name"
      deploy_release "$2" "${3:-}"
      ;;
    switch)
      [[ $# -eq 2 ]] || die "Usage: $0 switch v1.2.3"
      preflight "$command_name"
      switch_release "$2"
      ;;
    rollback)
      [[ $# -eq 1 ]] || die "Usage: $0 rollback"
      preflight "$command_name"
      rollback_release
      ;;
    status)
      preflight "$command_name"
      show_status
      ;;
    list)
      preflight "$command_name"
      list_images
      ;;
    cleanup-test)
      preflight "$command_name"
      remove_candidate
      log "Candidate container removed"
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      usage >&2
      die "Unknown command: $command_name"
      ;;
  esac
}

main "$@"

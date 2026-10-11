# ilovetables — task runner
# Requires: just, Node.js 22+, npm. python3 is only needed for `just serve`.

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# Show available recipes
default:
    @just --list

# Install dependencies from package-lock.json
install:
    npm ci

# Run unit tests
test:
    npm test

# Typecheck src/
check:
    npm run check

# Bundle the extension into dist/
build:
    npm run build

# Test, typecheck, and build. Load dist/ after this.
ci: test check build

# Serve fixtures at http://127.0.0.1:8765/fixtures/page.html
serve port="8765":
    python3 -m http.server {{ port }} --bind 127.0.0.1

# Remove the built extension
clean:
    rm -rf dist

# Check Node.js 22+, npm, and python3
doctor:
    #!/usr/bin/env bash
    set -euo pipefail
    fail=0
    if ! command -v node >/dev/null 2>&1; then
        echo "node missing — install Node.js 22 or newer"
        fail=1
    else
        major="$(node -p 'process.versions.node.split(".")[0]')"
        if (( major < 22 )); then
            echo "node $(node -v) — need 22 or newer"
            fail=1
        else
            echo "node $(node -v)"
        fi
    fi
    if command -v npm >/dev/null 2>&1; then
        echo "npm $(npm -v)"
    else
        echo "npm missing"
        fail=1
    fi
    if command -v python3 >/dev/null 2>&1; then
        echo "python3 $(python3 --version | awk '{print $2}')"
    else
        echo "python3 missing — needed for just serve"
        fail=1
    fi
    exit "$fail"

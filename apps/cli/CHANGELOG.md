# @useanysh/calendar-cli

## 0.4.1

### Patch Changes

- 870a52c: Rename `calendar-url` command to `url` and add QR code description text

## 0.4.0

### Minor Changes

- d9f1d84: Rename `calendar feed-url` to top-level `calendar-url` command with QR code support, URL caching, and `--rotate` flag

## 0.3.0

### Minor Changes

- 5ca123f: Auto-name PATs with device hostname, falling back to a random city name

## 0.2.0

### Minor Changes

- aa49359: Remove `--token` flag from `auth login` command. Authentication now uses browser-based flow only.

## 0.1.0

### Minor Changes

- a1b1444: Add browser-based CLI authentication: `use-calendar auth login` opens the web UI for login/register and automatically provisions a PAT

### Patch Changes

- Updated dependencies [a1b1444]
  - @useanysh/calendar-contracts@0.0.2

## 0.0.3

### Patch Changes

- 14eb1ac: Read CLI version from package.json at runtime instead of hardcoding

## 0.0.2

### Patch Changes

- ec9f978: Move DEFAULT_BASE_URL resolution into loadConfig with env var and production fallback

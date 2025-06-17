# Scripts Directory

This directory contains package management and build-related files.

## Files

- **`package-lock.json`** - NPM dependency lock file

## Purpose

This directory organizes package management files to keep the root directory clean while maintaining functionality through symlinks.

## Symlinks

- `/package-lock.json` → `scripts/package-lock.json`

## Note

The package-lock.json file is symlinked to the root directory because NPM expects it there, but the actual file is stored here for organization. 
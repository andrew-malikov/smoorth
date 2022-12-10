<h1 align="center">
Smoorth
</h1>

<div align="center">

![GitHub manifest version](https://img.shields.io/github/manifest-json/v/vallandemorty/smoorth?label=VERSION)
[![CI](https://github.com/VallanDeMorty/smoorth/actions/workflows/ci.yml/badge.svg)](https://github.com/VallanDeMorty/smoorth/actions/workflows/ci.yml)
[![Release](https://github.com/VallanDeMorty/smoorth/actions/workflows/release.yml/badge.svg)](https://github.com/VallanDeMorty/smoorth/actions/workflows/release.yml)

</div>

Replaces the default [Obsidian](https://obsidian.md/) caret with a smooth and round one. Works only with enabled Vim mode during editing.

<p align="center">
 <img src="./assets/dark_01.png" width="256">
 <img src="./assets/dark_02.png" width="256">
 <img src="./assets/dark_03.png" width="256">
</p>

## Features

- Smooth caret which stops blinking after 20 iterations.

## Installation via BRAT

- [How to BRAT](https://github.com/TfTHacker/obsidian42-brat#Quick-Guide-for-using-BRAT)

## Related

- [The blink animation](https://easings.net/#easeInOutCirc).

## Releasing new releases

- Update the `manifest.json` with a new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update the `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Tag the commit with a new version. Use the exact version number, don't include a prefix `v`. See here for an example: <https://github.com/obsidianmd/obsidian-sample-plugin/releases>

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## How to use

- Clone this repo.
- `pnpm install` to install dependencies
- `pnpm dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## API Documentation

See <https://github.com/obsidianmd/obsidian-api>

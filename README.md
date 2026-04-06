# My Startup Page

A minimalist new tab browser extension for Microsoft admins. Quickly search and access Microsoft admin portals like Entra, Intune, Azure, Defender, and hundreds more — right from your new tab page.

**Website:** [mystartup.page](https://mystartup.page)

## Features

- Fast, lightweight new tab replacement
- Searchbar to find and open 900+ Microsoft admin portals instantly
- Quick Links pre-configured with popular Microsoft portals (Entra, Intune, M365 Admin, Azure, Defender)
- Browse and add portals from [merill/cmd](https://github.com/merill/cmd) and [msportals.io](https://msportals.io) catalogs
- Clock with analog and digital modes
- Greetings with your name
- Dark mode (auto, system, or manual)
- Notes widget with Markdown support
- Solid color or local file backgrounds
- Page layout customization
- Custom CSS styling
- Multilanguage support (42 languages)
- Privacy focused — only requires `storage` permission, no external API calls

## Install

| Browser | Link |
|---------|------|
| Edge | _Coming soon_ |
| Chrome | _Coming soon_ |
| Firefox | _Coming soon_ |

## Development

### Prerequisites

- [Deno](https://docs.deno.com/runtime/) runtime

### Run locally

```bash
# Install dependencies
deno install

# Build and watch for a specific platform
deno task edge
deno task chrome
deno task firefox
```

### Load the extension

**Edge**
1. Go to `edge://extensions`
2. Enable Developer mode
3. Load unpacked and select the `release/edge` folder

**Chrome**
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Load unpacked and select the `release/chrome` folder

**Firefox**
1. Go to `about:debugging#/runtime/this-firefox`
2. Select "Load temporary Add-on"
3. Select `manifest.json` in the `release/firefox` folder

### Useful commands

```bash
deno task format   # Format code
deno task types    # Type check
deno task build    # Production build for all platforms
```

## Attribution

My Startup Page is a modified version of [Bonjourr](https://bonjourr.fr), an open source new tab browser extension created by [Victor Azevedo](https://github.com/victrme) and [Tahoe Beetschen](https://github.com/morceaudebois). The original source code is available at [github.com/victrme/Bonjourr](https://github.com/victrme/Bonjourr).

This project removes Bonjourr's external API dependencies (weather, dynamic backgrounds, quotes, web fonts) and replaces the search bar with a Microsoft admin portal search powered by locally cached data from [merill/cmd](https://github.com/merill/cmd) and [msportals.io](https://github.com/adamfowlerit/msportals.io).

### Translations

The translations included in this project were contributed to the original Bonjourr project by its community. We gratefully acknowledge all the translators listed in the [Bonjourr repository](https://github.com/victrme/Bonjourr#-contributors-and-translations).

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE.md), the same license as the original Bonjourr project.

Copyright (C) 2025 Merill Fernando

Based on Bonjourr, Copyright (C) Victor Azevedo and Tahoe Beetschen

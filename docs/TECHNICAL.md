# Technical Documentation


### Build Commands

Use Deno when running tasks. 

- Full Build: `deno task build`
- Platform-Specific (Dev Mode):
  - Chrome: `deno task chrome`
  - Firefox: `deno task firefox`
  - Edge: `deno task edge`
  - Online (Web version): `deno task online`
- Serve Locally: `deno task serve` (runs on port 8000 by default)

### Versioning & Releases

Yako uses a `VERSION` file at the repository root to track the current version (e.g. `1.0.3`).
The format is `MAJOR.MINOR.PATCH`.

**Automatic patch releases:** Every push to `main` (that changes extension code, not `website/`)
triggers the release workflow (`.github/workflows/release.yml`). The workflow:

1. Reads the current version from `VERSION`
2. Increments the patch number (e.g. `1.0.3` → `1.0.4`)
3. Writes the new version into `VERSION`, all browser manifests (`src/manifests/*.json`), and `src/settings.html`
4. Builds all platforms via `deno task build`
5. Packages browser ZIPs (Chrome, Edge, Firefox)
6. Commits the updated `VERSION` file back to `main` with message `release: v1.0.4`
7. Creates a git tag `v1.0.4` and a GitHub Release with the ZIPs attached

**Manual major/minor bumps:** To increment the major or minor version, edit the `VERSION` file
directly. For example, to go from `1.0.12` to `1.1.0` or `2.0.0`, update the file and commit.
The next release workflow run will increment the patch from there (e.g. `1.1.0` → `1.1.1`).

**Infinite loop prevention:** The release commit only changes `VERSION`. Both `ci.yml` and
`release.yml` have `VERSION` in their `paths-ignore` list, so the commit does not re-trigger
either workflow.

### Linting & Formatting

Yako strictly follows Deno's built-in formatting and linting rules.

- Lint Code: `deno lint`
- Format Code: `deno task format` (runs `deno fmt`)
- Type Checking: `deno task types` (runs `deno check`)

### Testing

- Run all tests everytime
- Run All Tests: `deno task test`

---

## 2. Code Style & Conventions

### Imports

- Mandatory Extensions: ALWAYS include the file extension in imports (e.g., `import { foo } from './utils.ts'`).
- Deno Modules: Use `jsr:` or `npm:` prefixes for external dependencies as defined in `deno.json`.
- Absolute Paths: Use relative paths for internal modules.

### Typing & Naming

- Strict Typing: Always prefer explicit types over `any`. Leverage TypeScript interfaces and types in `src/types/`.
- Constants: Use `UPPER_SNAKE_CASE` (e.g., `CURRENT_VERSION`, `SYNC_DEFAULT`).
- Functions/Variables: Use `camelCase`.
- File Naming: Use `kebab-case` or lowercase for filenames (e.g., `webext-storage.js`, `settings.ts`).

### Error Handling

- Use `try/catch` blocks for operations that might fail (e.g., storage access, API calls).
- Log warnings/errors using `console.warn` or `console.error` with descriptive messages.
- Avoid silent failures in critical paths like `startup()`.

### DOM Manipulation

- Yako is a browser extension; direct DOM manipulation is standard.
- Use `document.getElementById` or `document.querySelector`.
- Use `dataset` for state management on the `<html>` or `<body>` elements (e.g.,
  `document.documentElement.dataset.theme = 'dark'`).

---

## 3. Project Structure

- `/src/scripts/`: Main application logic.
  - `features/`: Modular components (clock, weather, backgrounds, etc.).
  - `shared/`: Utility functions used across features.
  - `utils/`: Low-level helpers (translations, permissions, etc.).
  - `services/`: Background services and storage management.
- `/src/types/`: TypeScript definitions.
- `/tasks/`: Build and automation scripts (written in TypeScript).
- `/tests/`: Test suite using `deno test`.
- `/_locales/`: Internationalization JSON files.

---

## 4. Internationalization (i18n)

- All user-facing strings should be localized.
- Use `traduction(null, sync.lang)` for initial translation and `setTranslationCache` for caching.
- To update translations after adding new keys to `_locales`, run:
  ```bash
  deno task translate
  ```

## 6. Feature Script & Settings Architecture

### Core Entry Point: The Dispatcher

Each feature exports a single function that acts as a state switcher. It handles two distinct phases: 
- Initialization
- Updates

```typescript
export function feature(init?: FeatureSync, update?: FeatureUpdate) {
    if (update) {
        updateFeature(update) // Live update from Settings
        return
    }
    if (init) {
        initFeature(init) // Initial load on Startup
    }
}
```

### UI Handlers (Setters)

Features use internal "handle" or "set" functions to manipulate the DOM. This keeps logic DRY as both initialization and
updates use the same UI handles.

- Styling: Prefer CSS variables on `document.documentElement` (`--feature-property`).
- State: Use `dataset` attributes or class toggles on the feature's container.

```typescript
const setWidth = (val: number) => document.documentElement.style.setProperty('--feature-width', `${val}em`)

const handleToggle = (state: boolean) => container?.classList.toggle('hidden', !state)
```

### The `updateFeature` Logic

This internal function processes partial changes from the settings menu.

1. Read: Fetches the current feature state from `storage.sync`.
2. Apply: Updates the object and immediately triggers the relevant UI Handlers.
3. Persist: Saves the updated object using `eventDebounce({ feature })` to optimize storage writes.

### Settings Wiring (`src/scripts/settings.ts`)

The settings module acts as a declarative controller that connects HTML inputs to feature functions.

Settings are wired using standard DOM events or the `onclickdown` utility. The convention is to pass `undefined` as the
first argument to signify a live update.

```typescript
// Example Wiring in initOptionsEvents()
paramId('i_feature-property').addEventListener('input', function () {
    feature(undefined, { property: this.value })
})
```

### Input Mapping Convention

| UI Input Type            | Event         | Feature Payload                |
| :----------------------- | :------------ | :----------------------------- |
| Sliders / Ranges     | `input`       | `{ property: this.value }`     |
| Dropdowns / Selects  | `change`      | `{ property: this.value }`     |
| Checkboxes / Toggles | `onclickdown` | `{ property: target.checked }` |
| Action Buttons       | `onclickdown` | `{ trigger: true }`            |

### Feature Best Practices

- Parallel States: Ensure the `init` logic and `update` logic are idempotent so settings can be changed repeatedly
  without side effects.
- Decoupling: The settings menu should never manipulate the feature's DOM directly; it must always go through the
  `feature()` entry point.
- Persistence: Only use `eventDebounce` for values that change frequently (like sliders) to avoid hitting browser
  storage limits.
- Naming: File names use `kebab-case`, while entry point functions use `camelCase` matching the feature name.

---

## 7. CSS Architecture & Styling

### Main Entry Point

The primary CSS entry point is `src/styles/style.css`. This file acts as a manifest that imports all other CSS modules
in a specific order.

### Import Order

1. `_global.css` - Must be imported first (CSS custom properties and global variables)
2. Interface styles (global layout, backgrounds, settings display)
3. Settings menu styles (global settings, inputs, dropdowns)
4. Components (reusable dialog boxes, forms)
5. Features (time, searchbar, notes, links, etc.)
6. `_responsive.css` - Must be imported last (responsive breakpoints)

### File Structure Convention

CSS files are organized by functional area:

- `interface/` - Main page styling
- `settings/` - Settings panel styling
- `features/` - Individual feature styling
- `components/` - Reusable UI components
- `_global.css` - CSS custom properties
- `_responsive.css` - Responsive breakpoints

### Selector Specificity Strategy

The project follows a low selector specificity approach:

1. Class-based styling preferred over ID selectors where possible
2. Repeat selectors rather than complex nested rules
3. Group related rules by functional area with clear comments

### Variable System

Global variables are defined in `_global.css` as CSS custom properties:

```css
:root {
    --page-width: 1600px;
    --page-gap: 1em;
    --font-family: -apple-system, system-ui, Ubuntu, Roboto, 'Open Sans';
    --border-radius: 25px;
}
```

### Theme Support

Light and dark themes are handled via data attributes:

```css
[data-theme='light'] {
    --color-text: #222222;
    --color-param: 255, 255, 255;
    --color-settings: #f2f2f7;
}

[data-theme='dark'] {
    --color-text: #ffffff;
    --color-param: 0, 0, 0;
    --color-settings: #000000;
}
```

### Styling Principles

#### 1. Progressive Enhancement

- Use `@supports` for feature detection
- Provide fallbacks for modern CSS features
- Only target modern Chromium and Firefox. No IE or Opera Mini.

#### 2. Responsive Design

- Breakpoints defined in `_responsive.css`
- Use `dvh` units with `vh` fallbacks

#### 3. Performance

- Minimal CSS nesting
- No `!important` declarations
- Efficient selector patterns
- CSS custom properties for runtime theming

#### 4. Maintainability

- Clear file organization
- Descriptive comments when creating complex selectors
- Consistent naming conventions
- Logical grouping of related styles

### Naming Conventions

#### ID Selectors

- `kebab-case` for element IDs
- Descriptive names indicating purpose
- Feature-specific prefixes where appropriate

#### CSS Classes

- Semantic names over presentational
- Reusable utility classes in `other.css`
- State classes like `.shown`, `.hidden`, `.active`

#### CSS Custom Properties

- `--prefix-description` format
- Group related properties
- Document default values

### Animation Guidelines

#### Transition Patterns

- Use CSS custom properties for timing functions
- Consistent easing curves (`--out-cubic`)
- Hardware-accelerated properties (`transform`, `opacity`)

#### Performance Considerations

- `will-change` for animated elements
- Minimize paint operations
- Debounce rapid animations

### Browser Support

- Modern browsers (Chrome 90+, Firefox 88+)
- No polyfills or shims for older browser support

---

## 8. Upstream Data Sync & Cloudflare Deployment

Yako serves all external data through the getyako.com website (hosted on Cloudflare Pages) instead
of fetching directly from GitHub at runtime. This improves load times via CDN caching and removes
the extension's runtime dependency on GitHub.

### What gets synced

| Source | Upstream Repo | Website Path |
| :--- | :--- | :--- |
| Microsoft Cloud Logos (icons) | `loryanstrant/MicrosoftCloudLogos` | `/icons/microsoft-cloud-logos/` |
| Icon tree manifest | Generated from above | `/icons/microsoft-cloud-logos-tree.json` |
| cmd.ms commands | `merill/cmd` | `/data/commands.csv` |
| msportals.io portals | `adamfowlerit/msportals.io` | `/data/portals/*.json` (9 files) |

### Sync script

`deno task sync-icons` runs `tasks/sync-icons.ts` which downloads all three sources in parallel
and places the files into `website/public/`. These paths are in `.gitignore` — they are not
committed to the repo.

Run this before building the website:

```bash
deno task sync-icons
```

### How the automated hourly check works

A GitHub Action (`.github/workflows/sync-upstream.yml`) runs every hour and:

1. Restores the last-known commit SHAs from GitHub Actions cache
2. Fetches the latest commit SHA from each of the 3 upstream repos (lightweight API calls)
3. Compares old vs new SHAs
4. If any SHA changed, triggers a Cloudflare Pages deploy hook and updates the cache
5. If nothing changed, exits immediately (no build triggered)

The Cloudflare Pages build then runs `sync-icons` which downloads fresh data, followed by the
Astro website build.

### Setup steps

Follow these steps to set up (or re-set up) the automated sync:

#### 1. Create a Cloudflare Pages deploy hook

1. Go to **Cloudflare Dashboard** > **Pages** > the yako website project
2. **Settings** > **Builds & deployments**
3. Scroll to **Deploy hooks**
4. Click **Add deploy hook**, name it `github-sync`, select the production branch
5. Copy the generated URL

#### 2. Add the deploy hook secret to GitHub

1. Go to the yako repo on GitHub > **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Name: `CLOUDFLARE_DEPLOY_HOOK`
4. Value: paste the deploy hook URL from step 1

#### 3. Configure Cloudflare Pages build settings

In **Cloudflare Dashboard** > **Pages** > your project > **Settings** > **Builds & deployments**:

**Build command:**

```
curl -fsSL https://deno.land/install.sh | sh && export PATH="$HOME/.deno/bin:$PATH" && deno task sync-icons && cd website && npm install && npm run build
```

Note: Cloudflare's build environment does not include Deno, so it must be installed first.
Use `npm install` (not `npm ci`) because there is no `package-lock.json` in the website
directory.

**Build output directory:**

```
website/dist
```

This must be set relative to the repo root. Astro outputs to `website/dist/`, and Cloudflare
needs the full path.

#### 4. Verify the setup

1. Go to **Actions** > **sync-upstream** > **Run workflow** to trigger manually
2. The first run always triggers a deploy (no cached SHAs yet)
3. Check the Cloudflare Pages dashboard to confirm the build started
4. Subsequent runs will only trigger when an upstream repo has new commits

#### 5. Changing the check frequency

Edit the cron schedule in `.github/workflows/sync-upstream.yml`:

```yaml
schedule:
    - cron: '17 * * * *'  # Every hour at :17
```

Examples:
- Every 30 minutes: `'*/30 * * * *'`
- Every 6 hours: `'17 */6 * * *'`
- Once daily at 2am UTC: `'0 2 * * *'`

### Troubleshooting

- **`deno: not found`**: Cloudflare's build environment does not include Deno. The build
  command must install it first with `curl -fsSL https://deno.land/install.sh | sh` and add
  it to PATH.
- **`npm ci` fails with lockfile error**: Use `npm install` instead. The website directory
  does not have a `package-lock.json`.
- **`Output directory "dist" not found`**: The build output directory in Cloudflare Pages
  must be set to `website/dist` (relative to the repo root), not just `dist`.
- **GitHub API rate limits**: Unauthenticated requests allow 60/hour. The workflow makes 3
  requests per run, so hourly checks are well within limits.
- **Cache not updating**: GitHub Actions cache is immutable per key. The workflow deletes
  the old `upstream-shas` cache key before saving the new one.
- **Deploy hook not firing**: Check that the `CLOUDFLARE_DEPLOY_HOOK` secret is set correctly
  in GitHub repo settings. The workflow logs will show "Cloudflare deploy hook triggered" on
  success.

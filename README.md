# React-Finity

A browser-based parametric 3D modeling application for the [Gridfinity](https://www.youtube.com/watch?v=ra_9zU-mnl8) modular storage system. Define storage components through parameters, attach modifiers, preview in real-time 3D, and export print-ready models.

## Features

- **Parametric baseplate generation** -- configurable grid size with socket profiles, magnet holes, and screw holes
- **Bin/container generation** -- configurable width, depth, and height with corner fillets, stacking lip, and hollow interior
- **Modifier system** -- composable modifiers that attach to bins:
  - Divider Grid -- internal divider walls with configurable count and thickness
  - Label Tab -- angled label surface on any wall face
  - Scoop -- curved cutout for easy part access
  - Insert -- open-top compartment grid with rim and internal walls
  - Lid -- flat or stacking lid variant
- **Print Layout view** -- dedicated view with virtual print bed, automatic FDM-optimal orientation, and row-based object arrangement
- **STL export** -- binary STL export of individual objects, all objects as ZIP, or merged plate STL
- **Print bed presets** -- configurable bed sizes (220x220, 256x256, 350x350mm) with spacing control
- **Real-time 3D viewport** -- orbit camera, transform gizmo, grid snapping, measurement overlay
- **Camera presets** -- top, front, side, and isometric views
- **Dimension profiles** -- Official, Tight Fit, and Loose Fit presets for all Gridfinity dimensions
- **Keyboard shortcuts** -- Delete/Backspace to remove, Escape to deselect, Ctrl+P for print layout, Ctrl+Shift+E to export

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for bundling and dev server
- [React Three Fiber](https://r3f.docs.pmnd.rs/) for 3D rendering
- [Zustand](https://zustand.docs.pmnd.rs/) for state management
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) for the interface
- [Vitest](https://vitest.dev/) for unit tests
- [Playwright](https://playwright.dev/) for end-to-end tests

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm

### Installation

```bash
git clone https://github.com/tyevco/react-finity.git
cd react-finity
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

### Lint & Format

```bash
npm run lint
npm run format
```

### Testing

```bash
# Unit tests
npm run test

# Unit tests in watch mode
npm run test:watch

# End-to-end tests (requires Playwright browsers)
npx playwright install chromium
npm run test:e2e
```

## Project Structure

```
src/
  app/                    App entry point & layout
  components/
    panels/               Left (object list) & right (properties) panels
      modifiers/          Per-modifier control components
    viewport/             3D viewport (React Three Fiber canvas)
    toolbar/              Top toolbar
    ui/                   shadcn/ui primitives
  engine/
    geometry/             Parametric geometry generators
      modifiers/          Modifier geometry generators
    export/               Export & print layout utilities
    constants.ts          Dimension profiles & default params
    snapping.ts           Grid snapping logic
  hooks/                  Custom React hooks
  store/                  Zustand stores
  types/                  TypeScript interfaces
  lib/                    Utility functions
e2e/                      Playwright end-to-end tests
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan. Current status:

- Phase 1: Foundation & App Shell -- Complete
- Phase 2: Bin Generation & Core Features -- Complete
- Phase 3: Interactivity & Manipulation -- Complete
- Phase 4: Modifier System & Advanced Geometry -- Complete
- Phase 5: Export & Print Layout -- Complete
- Phase 6: Polish & Advanced UX -- Planned
- Phase 7: Desktop App (Tauri) -- Planned

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

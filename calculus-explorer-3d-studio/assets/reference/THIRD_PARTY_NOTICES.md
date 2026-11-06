# Third-party notices

## Three.js

- Version: `0.169.0`
- Source: <https://github.com/mrdoob/three.js>
- CDN: `https://cdn.jsdelivr.net/npm/three@0.169.0/`
- License: MIT
- Use: WebGL renderer, scene graph, geometry, materials, lights, OrbitControls, math primitives.

```
Copyright © 2010-2025 three.js authors
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
```

## Fonts

No webfonts. The UI uses the operating system stack (`-apple-system`, `Segoe UI`, `Roboto`, `Helvetica Neue`, Arial) and the display face uses installed Palatino/Iowan Old Style/Georgia. Nothing is redistributed.

## Icons

Inline SVG paths and a hand-authored favicon. No icon library.

## Curriculum

The eight-unit structure follows the publicly documented Khan Academy AP®/College Calculus AB course framework. No Khan Academy text, video, exercise, image, or asset is copied or redistributed. All prose, examples, questions, and code are original to this project.

AP® is a trademark registered by the College Board, which is not affiliated with and does not endorse this project. Khan Academy is a trademark of Khan Academy, Inc.

## Runtime services

- GitHub Pages serves the static files.
- jsDelivr serves the pinned Three.js module.

Both may log standard request metadata under their own policies. The app adds no telemetry.

## Build tooling

- Node.js built-in test runner and WebSocket for verification.
- Google Chrome (headless) for the browser suite and screenshots.
- OpenCode and DeepSeek V4.1 Flash for the build itself.

None of these are shipped as runtime dependencies.

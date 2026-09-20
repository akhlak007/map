# EchoPath Sonar Map Studio

A dependency-free local web app that converts left/right UGRV sonar CSV logs into an interactive, vehicle-relative plan map with pan, zoom, corridor expansion, and playback tools.

## Run Locally

```bash
# Using Node.js
npm start
# or: node server.js

# Or using Python
python -m http.server 8080
```

Then open <http://localhost:8080> in your browser.

## Features

- **2D Plan View Corridor Reconstruction**: Live reconstruction of vehicle route and side walls from sonar telemetry.
- **Interactive Viewport Controls**:
  - Pan by dragging the canvas.
  - Smooth mouse wheel & pinch-to-zoom.
  - Floating HUD controls (`+`, `−`, `⛶ Overview Fit`, `🎯 Center Vehicle`, `1:1 Reset`).
  - Adjustable **Corridor Width Zoom** (`1.0× - 10.0×`) to clearly inspect narrow bottlenecks and obstacle spacing.
  - Interactive **Route Overview Minimap** with live camera viewport box.
  - **Hover Tooltip** inspection and click-to-seek along the track.
- **Sonar Radar Scope**: Live sweeping blip radar with left/right beam visualization.
- **Mission Playback**: Time scrubbing and playback speed controls (1×, 2×, 5×, 10×).
- **Hazard Detection**: Highlights restricted corridor passages and narrow clearance hazards (< 30 cm).
- **Local & Private**: All telemetry processing runs entirely client-side inside the browser.

## Data Format

The app accepts CSV files containing `Left Distance (cm)` and `Right Distance (cm)` columns (with optional `Date` and `Time` headers). Long pauses between sessions are automatically handled.

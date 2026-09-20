# EchoPath — Sonar Map Studio

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=flat-square&logo=github)](https://akhlak007.github.io/map/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-None-blue?style=flat-square)](#)

> **Turn left/right UGRV & robotic sonar logs into clean, vehicle-relative spatial intelligence.**

**EchoPath** is a dependency-free, high-performance web application designed to reconstruct 2D corridor plan views, detect clearance hazards, and simulate missions from raw sonar telemetry logs.

🌐 **Live Demo:** [https://akhlak007.github.io/map/](https://akhlak007.github.io/map/)

---

## ✨ Features

### 🗺️ 2D Plan View Corridor Reconstruction
- **Spatial Track Mapping**: Reconstructs forward path from timestamps and estimated speed.
- **Inferred Boundaries**: Connects sonar returns into continuous corridor polygons with tactical gradient fills.
- **Dynamic Grid & Markers**: Longitudinal meter guides and lateral offset reference lines.

### 🔍 Interactive Viewport & Navigation
- **Fluid Pan & Zoom**: Smooth mouse wheel zooming anchored to pointer, pinch-to-zoom on touch devices, and grab-to-pan.
- **Corridor Width Zoom (`1.0× – 10.0×`)**: Solves extreme aspect ratio differences by expanding lateral wall spacing for clear obstacle analysis.
- **Floating HUD Controls**:
  - `+` / `−` : Quick zoom controls
  - `⛶` : Fit whole mission track into viewport
  - `🎯` : Focus camera onto active vehicle position
  - `1:1` : Reset zoom to baseline 100%
- **Route Minimap Navigator**: Real-time thumbnail preview in the corner with a draggable camera viewbox.
- **Hover Inspection**: Hover over any section of the route to inspect timestamps, left/right distances, clearance, and passage status.
- **Click-to-Seek**: Click anywhere on the map path to instantly jump the mission timeline.

### 📡 Live Sonar Radar Scope
- Sweeping radial radar with real-time left/right beam reflections.
- Color-coded return proximity indicators:
  - 🟠 **Near**: `< 25 cm` (Critical Proximity)
  - 🟢 **Medium**: `25 cm – 60 cm` (Moderate Clearance)
  - 🔵 **Far**: `> 60 cm` (Open Clearway)

### ⏱️ Mission Playback & Telemetry
- Timeline scrubbing with real-time position indicators.
- Multi-speed playback (`1×`, `2×`, `5×`, `10×`).
- Live metrics: Total samples, active mission duration, estimated route distance, and minimum gap encountered.

### ⚠️ Clearance Hazard & Bottleneck Detection
- Highlights restricted passageways (`clearance < 60 cm`) and critical pinch points (`clearance < 30 cm`).
- Visual safety alert overlays on the map.

### 🔒 100% Client-Side & Private
- Telemetry processing is executed entirely within your browser — no server uploads or external telemetry tracking.

---

## 📊 Telemetry Data Format

EchoPath parses CSV files containing sonar distance measurements. Example format:

```csv
Date,Time,Left Distance (cm),Right Distance (cm)
10-09-2026,06:51:13 PM,43.2,17.1
10-09-2026,06:51:33 PM,44.3,16.9
10-09-2026,06:51:53 PM,44.0,16.5
10-09-2026,06:52:13 PM,38.1,40.1
17-09-2026,03:47:17 PM,26.0,42.6
```

### Column Recognition
- **Left Distance**: `Left Distance (cm)`, `Left`, `Left Dist`
- **Right Distance**: `Right Distance (cm)`, `Right`, `Right Dist`
- **Time** (optional): `Time`, `Timestamp`
- **Date** (optional): `Date`

> **Note on Relative Mapping**: Without GPS/IMU odometry, forward displacement is estimated from timestamps and assumed vehicle speed. Logging session pauses (> 60s) are automatically filtered out from active route distance calculations.

---

## 🚀 Running Locally

No dependencies or build steps required.

### Using Node.js
```bash
npm start
# or: node server.js
```

### Using Python
```bash
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🎮 Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Pan Map** | Click & drag on canvas / 1-finger touch drag |
| **Zoom In / Out** | Mouse wheel scroll / Pinch with 2 fingers / HUD `+` and `−` |
| **Fit Route** | Click `⛶` button on top-right of map |
| **Center Vehicle** | Click `🎯` button on top-right of map |
| **Inspect Point** | Hover mouse over any point along the track |
| **Seek to Sample** | Click directly on the route line |
| **Minimap Seek** | Click anywhere on the bottom-left minimap strip |
| **Double-Click** | Toggle between full route fit and vehicle tracking |

---

## 🛠️ Project Structure

```
.
├── index.html        # Main studio UI layout & HUD elements
├── styles.css        # Tactical dark theme design system
├── app.js            # 2D canvas engine, sonar physics, telemetry parser
├── server.js         # Lightweight local dev server
├── sample-data.csv   # Sample sonar log for testing
├── demo-data.js      # Embedded demo dataset fallback
└── .github/
    └── workflows/    # Automated GitHub Pages CI/CD workflow
```

---

## 📄 License

MIT License © 2026 akhlak007

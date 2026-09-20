/**
 * EchoPath Sonar Map Studio
 * Interactive reconstruction of left/right UGRV sonar telemetry
 * High-performance 2D canvas viewport with pan, zoom, corridor stretching,
 * interactive inspection tooltip, HUD controls, and minimap navigator.
 */

(function () {
  'use strict';

  // DOM Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const reloadButton = document.getElementById('reloadButton');
  const fileNameEl = document.getElementById('fileName');
  const fileMetaEl = document.getElementById('fileMeta');
  const speedInput = document.getElementById('speedInput');
  const speedValue = document.getElementById('speedValue');
  const rangeInput = document.getElementById('rangeInput');
  const rangeValue = document.getElementById('rangeValue');
  const aspectInput = document.getElementById('aspectInput');
  const aspectValue = document.getElementById('aspectValue');
  const followToggle = document.getElementById('followToggle');
  const smoothToggle = document.getElementById('smoothToggle');
  const connectToggle = document.getElementById('connectToggle');
  const hazardToggle = document.getElementById('hazardToggle');
  const sampleCounter = document.getElementById('sampleCounter');
  const canvasWrap = document.getElementById('canvasWrap');
  const mapCanvas = document.getElementById('mapCanvas');
  const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const fitViewBtn = document.getElementById('fitViewBtn');
  const centerVehicleBtn = document.getElementById('centerVehicleBtn');
  const resetZoomBtn = document.getElementById('resetZoomBtn');
  const mapTooltip = document.getElementById('mapTooltip');
  const ttSample = document.getElementById('ttSample');
  const ttTime = document.getElementById('ttTime');
  const ttLeft = document.getElementById('ttLeft');
  const ttRight = document.getElementById('ttRight');
  const ttClearance = document.getElementById('ttClearance');
  const ttDist = document.getElementById('ttDist');
  const ttStatus = document.getElementById('ttStatus');
  const minimapCanvas = document.getElementById('minimapCanvas');
  const minimapViewbox = document.getElementById('minimapViewbox');
  const emptyState = document.getElementById('emptyState');
  const rangeTopEl = document.getElementById('rangeTop');
  const playButton = document.getElementById('playButton');
  const currentTimeEl = document.getElementById('currentTime');
  const timeline = document.getElementById('timeline');
  const endTimeEl = document.getElementById('endTime');
  const playbackSpeedBtn = document.getElementById('playbackSpeed');
  const radarCanvas = document.getElementById('radarCanvas');
  const radarIndexEl = document.getElementById('radarIndex');
  const leftValueEl = document.getElementById('leftValue');
  const rightValueEl = document.getElementById('rightValue');
  const clearanceValueEl = document.getElementById('clearanceValue');
  const clearanceBarEl = document.getElementById('clearanceBar');
  const clearanceStatusEl = document.getElementById('clearanceStatus');
  const statSamplesEl = document.getElementById('statSamples');
  const statDurationEl = document.getElementById('statDuration');
  const statDistanceEl = document.getElementById('statDistance');
  const statMinEl = document.getElementById('statMin');
  const systemStatusEl = document.getElementById('systemStatus');

  const mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;
  const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  // Application State
  let samples = [];
  let currentIndex = 0;
  let isPlaying = false;
  let playbackSpeed = 1;
  const speedMultipliers = [1, 2, 5, 10];
  let playbackTimer = null;
  let vehicleSpeed = 0.05; // m/s
  let corridorAspect = 3.0; // Corridor width expansion multiplier for clarity
  let isFollowVehicle = true;
  let isSmooth = true;
  let isConnected = true;
  let isHazardsEnabled = true;
  let displayRange = 0; // 0 = Auto
  let radarAngle = 0;
  let animFrameId = null;

  // Pan & Zoom Viewport State
  let viewScale = 1.0;
  let baselineScale = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let hasDragged = false;
  let userPannedManually = false;

  // Touch gesture state
  let touchStartDist = 0;
  let touchStartScale = 1;

  // Hover & Tooltip State
  let hoveredSampleIndex = -1;
  let mouseWorldPos = { x: 0, y: 0 };
  let isMouseOverCanvas = false;

  // Initialize
  function init() {
    setupEventListeners();
    setupCanvasDPI();

    // Auto-load demo data if present
    if (window.ECHOPATH_DEMO_CSV) {
      loadCSVContent(window.ECHOPATH_DEMO_CSV, 'sample-data.csv (Demo)');
    }

    startRenderLoop();
  }

  function setupCanvasDPI() {
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      if (mapCanvas && canvasWrap) {
        const rect = canvasWrap.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          mapCanvas.width = Math.round(rect.width * dpr);
          mapCanvas.height = Math.round(rect.height * dpr);
        }
      }
      if (radarCanvas && radarCanvas.parentElement) {
        const rect = radarCanvas.parentElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          radarCanvas.width = Math.round(rect.width * dpr);
          radarCanvas.height = Math.round(rect.height * dpr);
        }
      }
      if (minimapCanvas) {
        minimapCanvas.width = 80 * dpr;
        minimapCanvas.height = 140 * dpr;
      }

      if (samples.length > 0 && !userPannedManually) {
        if (isFollowVehicle) {
          centerCameraOnSample(currentIndex, false);
        } else {
          fitMapToView();
        }
      }
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 60);
  }

  function setupEventListeners() {
    // File upload
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag');
        if (e.dataTransfer.files.length > 0) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFile(e.target.files[0]);
        }
      });
    }

    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }

    // Vehicle Speed Input
    if (speedInput) {
      speedInput.addEventListener('input', (e) => {
        vehicleSpeed = parseFloat(e.target.value);
        if (speedValue) speedValue.textContent = `${vehicleSpeed.toFixed(2)} m/s`;
        recomputeSpatialCoordinates();
        updateStats();
        if (!userPannedManually) fitMapToView();
      });
    }

    // Display Range Input
    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => {
        displayRange = parseInt(e.target.value, 10);
        if (rangeValue) rangeValue.textContent = displayRange === 0 ? 'Auto' : `${displayRange} cm`;
      });
    }

    // Corridor Width Zoom (Aspect)
    if (aspectInput) {
      aspectInput.addEventListener('input', (e) => {
        corridorAspect = parseFloat(e.target.value);
        if (aspectValue) aspectValue.textContent = `${corridorAspect.toFixed(1)}×`;
      });
    }

    // Follow Vehicle Toggle
    if (followToggle) {
      followToggle.addEventListener('click', () => {
        setFollowVehicleMode(!isFollowVehicle);
      });
    }

    // Smoothing Toggle
    if (smoothToggle) {
      smoothToggle.addEventListener('click', () => {
        isSmooth = !isSmooth;
        smoothToggle.classList.toggle('active', isSmooth);
        smoothToggle.setAttribute('aria-checked', String(isSmooth));
      });
    }

    // Connect Returns Toggle
    if (connectToggle) {
      connectToggle.addEventListener('click', () => {
        isConnected = !isConnected;
        connectToggle.classList.toggle('active', isConnected);
        connectToggle.setAttribute('aria-checked', String(isConnected));
      });
    }

    // Hazards Toggle
    if (hazardToggle) {
      hazardToggle.addEventListener('click', () => {
        isHazardsEnabled = !isHazardsEnabled;
        hazardToggle.classList.toggle('active', isHazardsEnabled);
        hazardToggle.setAttribute('aria-checked', String(isHazardsEnabled));
      });
    }

    // Playback Controls
    if (playButton) {
      playButton.addEventListener('click', togglePlay);
    }

    if (timeline) {
      timeline.addEventListener('input', (e) => {
        setSampleIndex(parseInt(e.target.value, 10));
      });
    }

    if (playbackSpeedBtn) {
      playbackSpeedBtn.addEventListener('click', () => {
        const nextIdx = (speedMultipliers.indexOf(playbackSpeed) + 1) % speedMultipliers.length;
        playbackSpeed = speedMultipliers[nextIdx];
        playbackSpeedBtn.textContent = `${playbackSpeed}×`;
        if (isPlaying) {
          stopPlayback();
          startPlayback();
        }
      });
    }

    // HUD Zoom & Pan Buttons
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => zoomByFactor(1.35));
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => zoomByFactor(1 / 1.35));
    }
    if (fitViewBtn) {
      fitViewBtn.addEventListener('click', () => {
        setFollowVehicleMode(false);
        userPannedManually = true;
        fitMapToView();
      });
    }
    if (centerVehicleBtn) {
      centerVehicleBtn.addEventListener('click', () => {
        setFollowVehicleMode(true);
        userPannedManually = false;
        centerCameraOnSample(currentIndex, true);
      });
    }
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => {
        viewScale = 1.0;
        updateZoomDisplay();
        centerCameraOnSample(currentIndex, true);
      });
    }

    // Map Canvas Interaction: Mouse Pan, Zoom, Hover & Click-to-Seek
    if (canvasWrap) {
      canvasWrap.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // only left click
        isDragging = true;
        hasDragged = false;
        dragStartX = e.clientX - panX;
        dragStartY = e.clientY - panY;
        canvasWrap.classList.add('grabbing');
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const dx = Math.abs(e.clientX - (dragStartX + panX));
          const dy = Math.abs(e.clientY - (dragStartY + panY));
          if (dx > 3 || dy > 3) {
            hasDragged = true;
            userPannedManually = true;
          }
          panX = e.clientX - dragStartX;
          panY = e.clientY - dragStartY;
        }

        // Handle hover tooltip if mouse is over canvas wrap
        if (isMouseOverCanvas && samples.length > 0) {
          updateHoverSample(e.clientX, e.clientY);
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (canvasWrap) canvasWrap.classList.remove('grabbing');

        // If it was a click (not a drag), jump timeline to hovered sample
        if (!hasDragged && hoveredSampleIndex >= 0 && hoveredSampleIndex < samples.length) {
          setSampleIndex(hoveredSampleIndex);
        }
      });

      canvasWrap.addEventListener('mouseenter', () => {
        isMouseOverCanvas = true;
      });

      canvasWrap.addEventListener('mouseleave', () => {
        isMouseOverCanvas = false;
        hoveredSampleIndex = -1;
        if (mapTooltip) mapTooltip.style.display = 'none';
      });

      // Mouse Wheel Zoom
      canvasWrap.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
        const rect = canvasWrap.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom relative to mouse position
        panX = mouseX - (mouseX - panX) * zoomFactor;
        panY = mouseY - (mouseY - panY) * zoomFactor;
        viewScale *= zoomFactor;
        viewScale = Math.max(0.02, Math.min(50, viewScale));
        userPannedManually = true;
        updateZoomDisplay();
      }, { passive: false });

      // Double-click to toggle fit / center
      canvasWrap.addEventListener('dblclick', () => {
        if (isFollowVehicle) {
          setFollowVehicleMode(false);
          fitMapToView();
        } else {
          setFollowVehicleMode(true);
          centerCameraOnSample(currentIndex, true);
        }
      });

      // Touch Gestures: Pan & Pinch-to-zoom
      canvasWrap.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          hasDragged = false;
          dragStartX = e.touches[0].clientX - panX;
          dragStartY = e.touches[0].clientY - panY;
        } else if (e.touches.length === 2) {
          isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          touchStartDist = Math.hypot(dx, dy);
          touchStartScale = viewScale;
        }
      }, { passive: true });

      canvasWrap.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging) {
          panX = e.touches[0].clientX - dragStartX;
          panY = e.touches[0].clientY - dragStartY;
          hasDragged = true;
          userPannedManually = true;
        } else if (e.touches.length === 2 && touchStartDist > 0) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDist = Math.hypot(dx, dy);
          const factor = currentDist / touchStartDist;
          viewScale = Math.max(0.02, Math.min(50, touchStartScale * factor));
          updateZoomDisplay();
          userPannedManually = true;
        }
      }, { passive: true });

      canvasWrap.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
          isDragging = false;
          touchStartDist = 0;
        }
      }, { passive: true });
    }

    // Minimap Navigation: Click to jump along route
    if (minimapCanvas) {
      minimapCanvas.addEventListener('click', (e) => {
        if (!samples.length) return;
        const rect = minimapCanvas.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const ratio = 1 - (clickY / rect.height); // Invert: 0 is bottom, 1 is top
        const targetSampleIdx = Math.round(Math.max(0, Math.min(samples.length - 1, ratio * (samples.length - 1))));
        setSampleIndex(targetSampleIdx);
        centerCameraOnSample(targetSampleIdx, true);
      });
    }
  }

  function setFollowVehicleMode(enabled) {
    isFollowVehicle = enabled;
    if (followToggle) {
      followToggle.classList.toggle('active', isFollowVehicle);
      followToggle.setAttribute('aria-checked', String(isFollowVehicle));
    }
  }

  function zoomByFactor(factor) {
    if (!canvasWrap) return;
    const rect = canvasWrap.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    panX = cx - (cx - panX) * factor;
    panY = cy - (cy - panY) * factor;
    viewScale *= factor;
    viewScale = Math.max(0.02, Math.min(50, viewScale));
    updateZoomDisplay();
  }

  function updateZoomDisplay() {
    if (zoomLevelDisplay) {
      const pct = Math.round(viewScale * 100);
      zoomLevelDisplay.textContent = `${pct}%`;
    }
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      loadCSVContent(e.target.result, file.name);
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    let leftIdx = header.findIndex(h => h.includes('left') && h.includes('dist'));
    let rightIdx = header.findIndex(h => h.includes('right') && h.includes('dist'));
    let dateIdx = header.findIndex(h => h.includes('date'));
    let timeIdx = header.findIndex(h => h.includes('time'));

    // Fallbacks if header differs
    if (leftIdx === -1) leftIdx = header.findIndex(h => h.includes('left'));
    if (rightIdx === -1) rightIdx = header.findIndex(h => h.includes('right'));
    if (leftIdx === -1 && header.length >= 4) leftIdx = 2;
    if (rightIdx === -1 && header.length >= 4) rightIdx = 3;

    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length <= Math.max(leftIdx, rightIdx)) continue;

      const leftVal = parseFloat(cols[leftIdx]);
      const rightVal = parseFloat(cols[rightIdx]);

      if (isNaN(leftVal) || isNaN(rightVal)) continue;

      const dateStr = dateIdx !== -1 ? cols[dateIdx] : '';
      const timeStr = timeIdx !== -1 ? cols[timeIdx] : '';

      // Parse timestamp
      let timestamp = null;
      if (dateStr && timeStr) {
        const dParts = dateStr.split('-');
        let year, month, day;
        if (dParts.length === 3) {
          if (dParts[0].length === 4) {
            year = parseInt(dParts[0], 10);
            month = parseInt(dParts[1], 10) - 1;
            day = parseInt(dParts[2], 10);
          } else {
            day = parseInt(dParts[0], 10);
            month = parseInt(dParts[1], 10) - 1;
            year = parseInt(dParts[2], 10);
          }
        }
        const timeMatch = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseInt(timeMatch[3], 10);
          const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          timestamp = new Date(year || 2026, month || 0, day || 1, hours, minutes, seconds).getTime();
        }
      }

      parsed.push({
        rawIndex: i,
        date: dateStr,
        time: timeStr,
        timestamp: timestamp,
        left: leftVal,
        right: rightVal,
        clearance: leftVal + rightVal,
        y: 0 // Will be computed in recomputeSpatialCoordinates
      });
    }

    return parsed;
  }

  function loadCSVContent(csvText, fileName) {
    const data = parseCSV(csvText);
    if (!data.length) {
      alert('Unable to parse valid sonar records from the CSV file.');
      return;
    }

    samples = data;
    if (fileNameEl) fileNameEl.textContent = fileName;
    if (fileMetaEl) {
      const firstDate = samples[0].date || 'Active Log';
      fileMetaEl.textContent = `${samples.length} samples • ${firstDate}`;
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (playButton) playButton.disabled = false;
    if (timeline) {
      timeline.disabled = false;
      timeline.min = '0';
      timeline.max = String(samples.length - 1);
      timeline.value = '0';
    }
    if (endTimeEl && samples.length > 0) {
      endTimeEl.textContent = samples[samples.length - 1].time || `${samples.length}s`;
    }
    if (systemStatusEl) {
      systemStatusEl.textContent = 'TELEMETRY LOADED';
    }

    recomputeSpatialCoordinates();
    updateStats();
    setSampleIndex(0);
    userPannedManually = false;
    centerCameraOnSample(0, true);
  }

  function recomputeSpatialCoordinates() {
    if (!samples.length) return;

    let cumulativeY = 0;
    const MAX_GAP_SECONDS = 60; // Gaps longer than 60s are treated as pauses
    const DEFAULT_STEP_SEC = 20;

    for (let i = 0; i < samples.length; i++) {
      if (i === 0) {
        samples[i].y = 0;
        continue;
      }

      let dtSec = DEFAULT_STEP_SEC;
      const prev = samples[i - 1];
      const curr = samples[i];

      if (prev.timestamp && curr.timestamp) {
        const delta = (curr.timestamp - prev.timestamp) / 1000;
        if (delta > 0 && delta <= MAX_GAP_SECONDS) {
          dtSec = delta;
        } else if (delta > MAX_GAP_SECONDS) {
          dtSec = DEFAULT_STEP_SEC;
        }
      }

      // y in meters along vehicle track
      cumulativeY += dtSec * vehicleSpeed;
      samples[i].y = cumulativeY;
    }
  }

  function updateStats() {
    if (!samples.length) return;

    if (statSamplesEl) statSamplesEl.textContent = samples.length;

    let totalActiveSeconds = 0;
    const MAX_GAP_SECONDS = 60;
    const DEFAULT_STEP_SEC = 20;

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      if (prev.timestamp && curr.timestamp) {
        const delta = (curr.timestamp - prev.timestamp) / 1000;
        if (delta > 0 && delta <= MAX_GAP_SECONDS) {
          totalActiveSeconds += delta;
        } else {
          totalActiveSeconds += DEFAULT_STEP_SEC;
        }
      } else {
        totalActiveSeconds += DEFAULT_STEP_SEC;
      }
    }

    const minutes = Math.floor(totalActiveSeconds / 60);
    const seconds = Math.floor(totalActiveSeconds % 60);
    if (statDurationEl) statDurationEl.textContent = `${minutes}m ${seconds}s`;

    const totalDistance = samples[samples.length - 1].y;
    if (statDistanceEl) statDistanceEl.textContent = `${totalDistance.toFixed(1)} m`;

    const minClearance = Math.min(...samples.map(s => s.clearance));
    if (statMinEl) statMinEl.textContent = `${minClearance.toFixed(1)} cm`;
  }

  function setSampleIndex(idx) {
    if (idx < 0 || idx >= samples.length) return;
    currentIndex = idx;
    const sample = samples[currentIndex];

    // UI Updates
    if (timeline) timeline.value = String(currentIndex);
    if (currentTimeEl) currentTimeEl.textContent = sample.time || `+${currentIndex}s`;
    if (sampleCounter) sampleCounter.textContent = `SAMPLE ${currentIndex + 1} / ${samples.length}`;
    if (radarIndexEl) radarIndexEl.textContent = `#${currentIndex + 1}`;
    if (leftValueEl) leftValueEl.innerHTML = `${sample.left.toFixed(1)}<small>cm</small>`;
    if (rightValueEl) rightValueEl.innerHTML = `${sample.right.toFixed(1)}<small>cm</small>`;

    // Clearance
    const clearance = sample.clearance;
    if (clearanceValueEl) clearanceValueEl.innerHTML = `${clearance.toFixed(1)} <small>cm</small>`;
    if (clearanceBarEl) {
      const pct = Math.min(100, Math.max(5, (clearance / 160) * 100));
      clearanceBarEl.style.width = `${pct}%`;
      if (clearance < 30) {
        clearanceBarEl.style.background = 'var(--orange)';
      } else if (clearance < 70) {
        clearanceBarEl.style.background = 'var(--acid)';
      } else {
        clearanceBarEl.style.background = 'var(--cyan)';
      }
    }

    if (clearanceStatusEl) {
      if (clearance < 30) {
        clearanceStatusEl.textContent = 'CRITICAL TIGHT CORRIDOR';
        clearanceStatusEl.style.color = 'var(--orange)';
      } else if (clearance < 60) {
        clearanceStatusEl.textContent = 'RESTRICTED PASSAGEWAY';
        clearanceStatusEl.style.color = 'var(--acid)';
      } else {
        clearanceStatusEl.textContent = 'OPEN CLEARWAY';
        clearanceStatusEl.style.color = 'var(--cyan)';
      }
    }

    // Auto-scroll map camera along route if follow mode is active
    if (isFollowVehicle) {
      centerCameraOnSample(currentIndex, false);
    }
  }

  function togglePlay() {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (!samples.length) return;
    isPlaying = true;
    if (playButton) {
      playButton.textContent = '❚❚';
      playButton.setAttribute('aria-label', 'Pause scan');
    }
    if (systemStatusEl) {
      systemStatusEl.textContent = 'MISSION PLAYBACK';
    }

    const intervalMs = Math.max(40, Math.round(500 / playbackSpeed));
    playbackTimer = setInterval(() => {
      let next = currentIndex + 1;
      if (next >= samples.length) {
        next = 0; // loop
      }
      setSampleIndex(next);
    }, intervalMs);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playbackTimer) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
    if (playButton) {
      playButton.textContent = '▶';
      playButton.setAttribute('aria-label', 'Play scan');
    }
    if (systemStatusEl) {
      systemStatusEl.textContent = 'MISSION PAUSED';
    }
  }

  // Smooth smoothing function (Moving Average 3-point)
  function getSmoothedSamples() {
    if (!isSmooth || samples.length < 3) return samples;

    const smoothed = [];
    for (let i = 0; i < samples.length; i++) {
      const prev = samples[Math.max(0, i - 1)];
      const curr = samples[i];
      const next = samples[Math.min(samples.length - 1, i + 1)];

      smoothed.push({
        ...curr,
        left: (prev.left + curr.left * 2 + next.left) / 4,
        right: (prev.right + curr.right * 2 + next.right) / 4,
        y: curr.y
      });
    }
    return smoothed;
  }

  // Fit Entire Route into view
  function fitMapToView() {
    if (!canvasWrap || !samples.length) return;
    const rect = canvasWrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const maxDist = displayRange > 0 ? displayRange : Math.max(...samples.map(s => Math.max(s.left, s.right)));
    const totalRouteYcm = samples[samples.length - 1].y * 100; // in cm

    const fitScaleX = (w * 0.7) / (maxDist * 2 * corridorAspect || 200);
    const fitScaleY = (h * 0.75) / (totalRouteYcm || 500);

    viewScale = Math.min(fitScaleX, fitScaleY);
    viewScale = Math.max(0.04, Math.min(10, viewScale));

    panX = w / 2;
    panY = h - 50;

    updateZoomDisplay();

    if (rangeTopEl) {
      rangeTopEl.textContent = `${(totalRouteYcm / 100).toFixed(1)} m`;
    }
  }

  // Center camera smoothly on a sample index
  function centerCameraOnSample(idx, resetScale) {
    if (!canvasWrap || !samples[idx]) return;
    const rect = canvasWrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (resetScale) {
      viewScale = 1.0;
      updateZoomDisplay();
    }

    const sampleYcm = samples[idx].y * 100;
    panX = w / 2;
    panY = (h * 0.65) + (sampleYcm * viewScale);
  }

  // Hover detection for interactive inspection
  function updateHoverSample(clientX, clientY) {
    if (!canvasWrap || !samples.length) return;
    const rect = canvasWrap.getBoundingClientRect();
    const mouseCanvasX = clientX - rect.left;
    const mouseCanvasY = clientY - rect.top;

    // Convert mouse canvas coordinates to world coordinates (in cm)
    // Canvas transform: translate(panX, panY), scale(viewScale, -viewScale)
    const worldY = -(mouseCanvasY - panY) / viewScale;
    const worldX = (mouseCanvasX - panX) / (viewScale * corridorAspect);

    mouseWorldPos = { x: worldX, y: worldY };

    // Find sample closest in Y
    let bestIdx = -1;
    let minDiff = Infinity;
    const renderData = getSmoothedSamples();

    for (let i = 0; i < renderData.length; i++) {
      const sY = renderData[i].y * 100;
      const diff = Math.abs(sY - worldY);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }

    // Proximity check in screen pixels (within 35px vertically)
    if (bestIdx >= 0 && minDiff * viewScale < 40) {
      hoveredSampleIndex = bestIdx;
      const s = samples[hoveredSampleIndex];
      
      if (mapTooltip) {
        mapTooltip.style.display = 'block';
        mapTooltip.style.left = `${mouseCanvasX}px`;
        mapTooltip.style.top = `${mouseCanvasY}px`;

        if (ttSample) ttSample.textContent = `SAMPLE #${s.rawIndex || (hoveredSampleIndex + 1)}`;
        if (ttTime) ttTime.textContent = s.time || `${s.y.toFixed(1)}m`;
        if (ttLeft) ttLeft.textContent = `${s.left.toFixed(1)} cm`;
        if (ttRight) ttRight.textContent = `${s.right.toFixed(1)} cm`;
        if (ttClearance) ttClearance.textContent = `${s.clearance.toFixed(1)} cm`;
        if (ttDist) ttDist.textContent = `${s.y.toFixed(1)} m`;

        if (ttStatus) {
          if (s.clearance < 30) {
            ttStatus.textContent = '⚠️ CRITICAL BOTTLENECK';
            ttStatus.style.color = 'var(--orange)';
          } else if (s.clearance < 60) {
            ttStatus.textContent = '⚡ NARROW PASSAGEWAY';
            ttStatus.style.color = 'var(--acid)';
          } else {
            ttStatus.textContent = '✓ CLEAR PASSAGE';
            ttStatus.style.color = 'var(--cyan)';
          }
        }
      }
    } else {
      hoveredSampleIndex = -1;
      if (mapTooltip) mapTooltip.style.display = 'none';
    }
  }

  function getColorForDistance(cm) {
    if (cm < 25) return '#ff9b50'; // near
    if (cm < 60) return '#b9f52d'; // mid
    return '#39e6c5'; // far
  }

  // Animation / Render Loop
  function startRenderLoop() {
    function frame() {
      renderMap();
      renderRadar();
      renderMinimap();
      animFrameId = requestAnimationFrame(frame);
    }
    animFrameId = requestAnimationFrame(frame);
  }

  // Main Map Canvas Renderer
  function renderMap() {
    if (!mapCtx || !mapCanvas || !canvasWrap) return;
    const rect = canvasWrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = window.devicePixelRatio || 1;

    // Reset transform & clear entire canvas buffer
    mapCtx.setTransform(1, 0, 0, 1, 0, 0);
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.scale(dpr, dpr);

    if (!samples.length) return;

    const renderData = getSmoothedSamples();
    const curSample = renderData[currentIndex] || renderData[0];
    const maxYcm = samples[samples.length - 1].y * 100;

    mapCtx.save();
    mapCtx.translate(panX, panY);
    mapCtx.scale(viewScale, -viewScale); // Invert Y so vehicle travels UPWARDS

    // 1. Grid Lines & Meter Guides
    mapCtx.strokeStyle = 'rgba(27, 48, 42, 0.4)';
    mapCtx.lineWidth = 1 / viewScale;
    
    // Horizontal distance lines every 1 meter (100 cm) or 5m depending on scale
    const meterStepCm = viewScale < 0.2 ? 500 : (viewScale < 0.5 ? 200 : 100);
    for (let y = 0; y <= maxYcm + 100; y += meterStepCm) {
      mapCtx.beginPath();
      mapCtx.moveTo(-300 * corridorAspect, y);
      mapCtx.lineTo(300 * corridorAspect, y);
      mapCtx.stroke();

      // Distance label in canvas space
      mapCtx.save();
      mapCtx.scale(1 / viewScale, -1 / viewScale); // Un-invert for readable text
      mapCtx.fillStyle = 'rgba(111, 139, 128, 0.6)';
      mapCtx.font = '9px "DM Mono", monospace';
      mapCtx.fillText(`${(y / 100).toFixed(0)}m`, (-320 * corridorAspect) * viewScale, -y * viewScale + 3);
      mapCtx.restore();
    }

    // Vertical Centerline (Vehicle track reference)
    mapCtx.setLineDash([4 / viewScale, 4 / viewScale]);
    mapCtx.strokeStyle = 'rgba(55, 80, 70, 0.6)';
    mapCtx.lineWidth = 1 / viewScale;
    mapCtx.beginPath();
    mapCtx.moveTo(0, 0);
    mapCtx.lineTo(0, maxYcm + 50);
    mapCtx.stroke();
    mapCtx.setLineDash([]);

    // 2. Bottleneck / Hazard Warning Zones (Clearance < 30 cm)
    if (isHazardsEnabled) {
      for (let i = 0; i < renderData.length; i++) {
        const s = renderData[i];
        if (s.clearance < 30 || s.left < 15 || s.right < 15) {
          const y = s.y * 100;
          mapCtx.fillStyle = 'rgba(255, 155, 80, 0.18)';
          mapCtx.beginPath();
          mapCtx.rect(-s.left * corridorAspect, y - 8, (s.left + s.right) * corridorAspect, 16);
          mapCtx.fill();
        }
      }
    }

    // 3. Corridor Polygon & Boundaries (Connected Returns)
    if (isConnected && renderData.length > 1) {
      mapCtx.beginPath();
      // Left boundary upwards
      for (let i = 0; i < renderData.length; i++) {
        const s = renderData[i];
        const lx = -s.left * corridorAspect;
        const ly = s.y * 100;
        if (i === 0) mapCtx.moveTo(lx, ly);
        else mapCtx.lineTo(lx, ly);
      }
      // Right boundary downwards
      for (let i = renderData.length - 1; i >= 0; i--) {
        const s = renderData[i];
        const rx = s.right * corridorAspect;
        const ry = s.y * 100;
        mapCtx.lineTo(rx, ry);
      }
      mapCtx.closePath();

      // Shaded corridor area
      const corridorGrad = mapCtx.createLinearGradient(0, 0, 0, maxYcm || 100);
      corridorGrad.addColorStop(0, 'rgba(57, 230, 197, 0.08)');
      corridorGrad.addColorStop(0.5, 'rgba(185, 245, 45, 0.09)');
      corridorGrad.addColorStop(1, 'rgba(255, 155, 80, 0.08)');
      mapCtx.fillStyle = corridorGrad;
      mapCtx.fill();

      // Outer boundary walls
      mapCtx.strokeStyle = 'rgba(185, 245, 45, 0.45)';
      mapCtx.lineWidth = 1.5 / viewScale;
      mapCtx.stroke();
    }

    // 4. Sonar Return Crossbeams & Point Clouds
    for (let i = 0; i < renderData.length; i++) {
      const s = renderData[i];
      const y = s.y * 100;
      const isCurrent = i === currentIndex;
      const isHovered = i === hoveredSampleIndex;
      const isPast = i <= currentIndex;

      // Crossbeams connecting center to walls
      mapCtx.strokeStyle = isCurrent 
        ? 'rgba(185, 245, 45, 0.85)' 
        : (isHovered ? 'rgba(57, 230, 197, 0.8)' : (isPast ? 'rgba(55, 80, 70, 0.35)' : 'rgba(27, 48, 42, 0.2)'));
      mapCtx.lineWidth = (isCurrent || isHovered ? 2 : 1) / viewScale;
      mapCtx.beginPath();
      mapCtx.moveTo(-s.left * corridorAspect, y);
      mapCtx.lineTo(s.right * corridorAspect, y);
      mapCtx.stroke();

      // Left point
      const ptRadius = (isCurrent || isHovered ? 5.5 : 3.0) / viewScale;
      mapCtx.fillStyle = getColorForDistance(s.left);
      mapCtx.beginPath();
      mapCtx.arc(-s.left * corridorAspect, y, ptRadius, 0, Math.PI * 2);
      mapCtx.fill();

      // Right point
      mapCtx.fillStyle = getColorForDistance(s.right);
      mapCtx.beginPath();
      mapCtx.arc(s.right * corridorAspect, y, ptRadius, 0, Math.PI * 2);
      mapCtx.fill();
    }

    // 5. Vehicle Trajectory Track Line
    mapCtx.beginPath();
    for (let i = 0; i <= currentIndex && i < renderData.length; i++) {
      const y = renderData[i].y * 100;
      if (i === 0) mapCtx.moveTo(0, y);
      else mapCtx.lineTo(0, y);
    }
    mapCtx.strokeStyle = '#b9f52d';
    mapCtx.lineWidth = 2.5 / viewScale;
    mapCtx.stroke();

    // 6. Hover Crosshair Highlight
    if (hoveredSampleIndex >= 0 && hoveredSampleIndex < renderData.length) {
      const hs = renderData[hoveredSampleIndex];
      const hy = hs.y * 100;
      mapCtx.strokeStyle = 'rgba(57, 230, 197, 0.9)';
      mapCtx.lineWidth = 1.5 / viewScale;
      mapCtx.setLineDash([3 / viewScale, 3 / viewScale]);
      mapCtx.beginPath();
      mapCtx.moveTo(-hs.left * corridorAspect - 15, hy);
      mapCtx.lineTo(hs.right * corridorAspect + 15, hy);
      mapCtx.stroke();
      mapCtx.setLineDash([]);
    }

    // 7. Start / End Markers
    // Start Marker (0m)
    mapCtx.fillStyle = 'rgba(57, 230, 197, 0.2)';
    mapCtx.strokeStyle = '#39e6c5';
    mapCtx.lineWidth = 1.5 / viewScale;
    mapCtx.beginPath();
    mapCtx.arc(0, 0, 6 / viewScale, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.stroke();

    // End Marker
    mapCtx.strokeStyle = '#ff9b50';
    mapCtx.beginPath();
    mapCtx.arc(0, maxYcm, 6 / viewScale, 0, Math.PI * 2);
    mapCtx.stroke();

    // 8. Vehicle Marker at currentIndex
    const curY = curSample.y * 100;
    const vehWidth = 18 / viewScale;
    const vehLength = 26 / viewScale;

    // Active Beam Lines from vehicle body to walls
    mapCtx.setLineDash([3 / viewScale, 3 / viewScale]);
    mapCtx.strokeStyle = '#39e6c5';
    mapCtx.lineWidth = 1.5 / viewScale;
    mapCtx.beginPath();
    mapCtx.moveTo(-vehWidth / 2, curY);
    mapCtx.lineTo(-curSample.left * corridorAspect, curY);
    mapCtx.stroke();

    mapCtx.strokeStyle = '#ff9b50';
    mapCtx.beginPath();
    mapCtx.moveTo(vehWidth / 2, curY);
    mapCtx.lineTo(curSample.right * corridorAspect, curY);
    mapCtx.stroke();
    mapCtx.setLineDash([]);

    // Vehicle Body
    mapCtx.fillStyle = '#0f221b';
    mapCtx.strokeStyle = '#b9f52d';
    mapCtx.lineWidth = 2 / viewScale;
    mapCtx.beginPath();
    mapCtx.roundRect(-vehWidth / 2, curY - vehLength / 2, vehWidth, vehLength, 3 / viewScale);
    mapCtx.fill();
    mapCtx.stroke();

    // Forward Direction Arrow
    mapCtx.fillStyle = '#b9f52d';
    mapCtx.beginPath();
    mapCtx.moveTo(0, curY + vehLength * 0.35);
    mapCtx.lineTo(-vehWidth * 0.3, curY);
    mapCtx.lineTo(0, curY + vehLength * 0.1);
    mapCtx.lineTo(vehWidth * 0.3, curY);
    mapCtx.closePath();
    mapCtx.fill();

    // Pulsing Sonar Ping Wave
    const pulseRadius = ((Date.now() / 25) % 40) / viewScale;
    mapCtx.strokeStyle = `rgba(185, 245, 45, ${Math.max(0, 1 - pulseRadius / (40 / viewScale))})`;
    mapCtx.lineWidth = 1.5 / viewScale;
    mapCtx.beginPath();
    mapCtx.arc(0, curY, pulseRadius, 0, Math.PI * 2);
    mapCtx.stroke();

    mapCtx.restore();
  }

  // Radar Return Scope Renderer (Right Panel)
  function renderRadar() {
    if (!radarCtx || !radarCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = radarCanvas.width / dpr;
    const h = radarCanvas.height / dpr;

    radarCtx.setTransform(1, 0, 0, 1, 0, 0);
    radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
    radarCtx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h - 22;
    const maxR = Math.min(cx - 15, cy - 15);

    // Draw Radar Rings (Arc from PI to 2*PI)
    radarCtx.strokeStyle = 'rgba(27, 48, 42, 0.8)';
    radarCtx.lineWidth = 1;
    const rings = [0.25, 0.5, 0.75, 1.0];
    rings.forEach(r => {
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, maxR * r, Math.PI, 0);
      radarCtx.stroke();
    });

    // Angle spokes
    const angles = [Math.PI, (5 * Math.PI) / 6, (3 * Math.PI) / 4, (2 * Math.PI) / 3, Math.PI / 2, Math.PI / 3, Math.PI / 4, Math.PI / 6, 0];
    angles.forEach(ang => {
      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy);
      radarCtx.lineTo(cx + Math.cos(ang) * maxR, cy - Math.sin(ang) * maxR);
      radarCtx.stroke();
    });

    // Sweeping Radar Beam
    radarAngle = (radarAngle + 0.035) % Math.PI;
    const sweepX = cx + Math.cos(Math.PI + radarAngle) * maxR;
    const sweepY = cy + Math.sin(Math.PI + radarAngle) * maxR;

    const sweepGrad = radarCtx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    sweepGrad.addColorStop(0, 'rgba(185, 245, 45, 0.25)');
    sweepGrad.addColorStop(1, 'rgba(185, 245, 45, 0.0)');

    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.arc(cx, cy, maxR, Math.PI + radarAngle - 0.22, Math.PI + radarAngle);
    radarCtx.closePath();
    radarCtx.fillStyle = sweepGrad;
    radarCtx.fill();

    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.lineTo(sweepX, sweepY);
    radarCtx.strokeStyle = 'rgba(185, 245, 45, 0.7)';
    radarCtx.lineWidth = 1.5;
    radarCtx.stroke();

    if (!samples.length) return;

    const curSample = samples[currentIndex];
    const maxRangeCm = 150; // Reference range for display
    const leftDist = curSample.left;
    const rightDist = curSample.right;

    // Left sensor blip (180 deg)
    const leftR = Math.min(maxR, (leftDist / maxRangeCm) * maxR);
    const lx = cx - leftR;
    const ly = cy;

    radarCtx.strokeStyle = 'rgba(57, 230, 197, 0.3)';
    radarCtx.lineWidth = 2;
    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.lineTo(lx, ly);
    radarCtx.stroke();

    radarCtx.fillStyle = getColorForDistance(leftDist);
    radarCtx.beginPath();
    radarCtx.arc(lx, ly, 6, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.strokeStyle = '#fff';
    radarCtx.lineWidth = 1;
    radarCtx.stroke();

    // Right sensor blip (0 deg)
    const rightR = Math.min(maxR, (rightDist / maxRangeCm) * maxR);
    const rx = cx + rightR;
    const ry = cy;

    radarCtx.strokeStyle = 'rgba(255, 155, 80, 0.3)';
    radarCtx.lineWidth = 2;
    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.lineTo(rx, ry);
    radarCtx.stroke();

    radarCtx.fillStyle = getColorForDistance(rightDist);
    radarCtx.beginPath();
    radarCtx.arc(rx, ry, 6, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.strokeStyle = '#fff';
    radarCtx.lineWidth = 1;
    radarCtx.stroke();

    // Center Vehicle Marker
    radarCtx.fillStyle = '#b9f52d';
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, 4, 0, Math.PI * 2);
    radarCtx.fill();
  }

  // Minimap Navigator Renderer
  function renderMinimap() {
    if (!minimapCtx || !minimapCanvas || !samples.length) return;
    const dpr = window.devicePixelRatio || 1;
    const mw = minimapCanvas.width / dpr;
    const mh = minimapCanvas.height / dpr;

    minimapCtx.setTransform(1, 0, 0, 1, 0, 0);
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimapCtx.scale(dpr, dpr);

    const maxYcm = samples[samples.length - 1].y * 100 || 1;
    const pad = 6;
    const drawH = mh - (pad * 2);
    const cx = mw / 2;

    // Draw route track
    minimapCtx.strokeStyle = 'rgba(27, 48, 42, 0.9)';
    minimapCtx.lineWidth = 1;
    minimapCtx.beginPath();
    minimapCtx.moveTo(cx, mh - pad);
    minimapCtx.lineTo(cx, pad);
    minimapCtx.stroke();

    // Draw corridor outline
    minimapCtx.fillStyle = 'rgba(57, 230, 197, 0.15)';
    minimapCtx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const ny = mh - pad - ((s.y * 100) / maxYcm) * drawH;
      const nx = cx - (s.left / 150) * (mw * 0.35);
      if (i === 0) minimapCtx.moveTo(nx, ny);
      else minimapCtx.lineTo(nx, ny);
    }
    for (let i = samples.length - 1; i >= 0; i--) {
      const s = samples[i];
      const ny = mh - pad - ((s.y * 100) / maxYcm) * drawH;
      const nx = cx + (s.right / 150) * (mw * 0.35);
      minimapCtx.lineTo(nx, ny);
    }
    minimapCtx.closePath();
    minimapCtx.fill();

    // Draw Vehicle Dot on Minimap
    const curSample = samples[currentIndex] || samples[0];
    const curMinimapY = mh - pad - ((curSample.y * 100) / maxYcm) * drawH;
    minimapCtx.fillStyle = '#b9f52d';
    minimapCtx.beginPath();
    minimapCtx.arc(cx, curMinimapY, 3.5, 0, Math.PI * 2);
    minimapCtx.fill();

    // Update Viewbox on Minimap
    if (minimapViewbox && canvasWrap) {
      const wrapRect = canvasWrap.getBoundingClientRect();
      const topWorldY = -(0 - panY) / viewScale;
      const botWorldY = -(wrapRect.height - panY) / viewScale;

      const topMinimapY = mh - pad - (topWorldY / maxYcm) * drawH;
      const botMinimapY = mh - pad - (botWorldY / maxYcm) * drawH;

      const boxTop = Math.max(0, Math.min(mh, Math.min(topMinimapY, botMinimapY)));
      const boxHeight = Math.max(8, Math.min(mh, Math.abs(botMinimapY - topMinimapY)));

      minimapViewbox.style.top = `${boxTop + 20}px`; // accounting for title header
      minimapViewbox.style.left = '6px';
      minimapViewbox.style.width = `${mw}px`;
      minimapViewbox.style.height = `${boxHeight}px`;
    }
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

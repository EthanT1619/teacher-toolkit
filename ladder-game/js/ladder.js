const LadderGame = (() => {
  /* 교실·프로젝터용 크기 (약 4m 거리 가시성) */
  const TOP_Y = 125;
  const CANVAS_HEIGHT = 920;
  const BOTTOM_MARGIN = 105;
  const MIN_WIDTH = 560;
  const PER_COLUMN = 168;
  const SIDE_PADDING = 130;
  const BADGE_Y = 74;
  const BADGE_RADIUS = 34;
  const BADGE_FONT = 26;
  const RESULT_FONT = 22;
  const RESULT_OFFSET = 50;
  const RAIL_WIDTH = 7;
  const BRIDGE_WIDTH = 7;
  const DIAGONAL_WIDTH = 5.5;
  const PATH_WIDTH = 9;
  const PATH_DOT_RADIUS = 14;
  const EPS = 0.5;

  const COLORS = {
    canvasBg: "#ffffff",
    rail: "#0f172a",
    bridge: "#1d4ed8",
    diagonal: "#475569",
    badge: "#2563eb",
    badgeText: "#ffffff",
    resultText: "#0f172a",
    path: "#dc2626",
    pathDotStroke: "#ffffff",
  };

  const COMPLEXITY_LEVELS = [
    { label: "매우 단순", perLine: 2, diagonals: false },
    { label: "단순", perLine: 3, diagonals: false },
    { label: "보통", perLine: 4, diagonals: false },
    { label: "복잡", perLine: 5, diagonals: false },
    { label: "매우 복잡", perLine: 5, diagonals: true },
  ];

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getComplexityConfig(level) {
    const idx = Math.max(0, Math.min(level - 1, COMPLEXITY_LEVELS.length - 1));
    return { level: idx + 1, ...COMPLEXITY_LEVELS[idx] };
  }

  function getBridgeRows(topY, bottomY, stepY) {
    const rows = [];
    for (let y = topY + stepY; y < bottomY - stepY; y += stepY) rows.push(y);
    return rows;
  }

  function computeStepY(count, perLine, bottomY) {
    const targetRows = Math.ceil((count * perLine) / 2) + 1;
    const usable = bottomY - TOP_Y - 32;
    return Math.max(22, Math.min(46, Math.floor(usable / targetRows)));
  }

  function generateBridges(count, perLine, topY, bottomY, stepY) {
    const rows = getBridgeRows(topY, bottomY, stepY);
    if (rows.length === 0 || count < 2) return [];

    const lineCount = Array(count).fill(0);
    const list = [];
    const usedRows = new Set();

    function place(y, index) {
      list.push({ y, index });
      usedRows.add(y);
      lineCount[index]++;
      lineCount[index + 1]++;
    }

    function allSatisfied() {
      return lineCount.every(c => c >= perLine);
    }

    function candidateIndices() {
      const indices = [];
      for (let i = 0; i < count - 1; i++) {
        if (lineCount[i] < perLine || lineCount[i + 1] < perLine) indices.push(i);
      }
      return shuffle(indices);
    }

    let stuck = 0;
    while (!allSatisfied() && stuck < 80) {
      const indices = candidateIndices();
      const freeRows = rows.filter(y => !usedRows.has(y));
      if (indices.length === 0 || freeRows.length === 0) break;

      let placed = false;
      for (const index of indices) {
        for (const y of shuffle(freeRows)) {
          if (lineCount[index] >= perLine && lineCount[index + 1] >= perLine) continue;
          place(y, index);
          placed = true;
          stuck = 0;
          break;
        }
        if (placed) break;
      }
      if (!placed) stuck++;
    }

    return list.sort((a, b) => a.y - b.y || a.index - b.index);
  }

  function createConnectionRegistry(stepY) {
    const minGap = stepY * 0.65;
    const byCol = new Map();

    function colPoints(col) {
      if (!byCol.has(col)) byCol.set(col, []);
      return byCol.get(col);
    }

    function canAttach(col, y) {
      return colPoints(col).every(existing => Math.abs(existing - y) >= minGap);
    }

    function attach(col, y) {
      colPoints(col).push(y);
    }

    function registerBridge(b) {
      attach(b.index, b.y);
      attach(b.index + 1, b.y);
    }

    function tryRegisterDiagonal(d) {
      if (!canAttach(d.index, d.yLeft)) return false;
      if (!canAttach(d.index + 1, d.yRight)) return false;
      attach(d.index, d.yLeft);
      attach(d.index + 1, d.yRight);
      return true;
    }

    return { registerBridge, tryRegisterDiagonal };
  }

  function generateDiagonals(count, bridges, topY, bottomY, stepY) {
    const rows = getBridgeRows(topY, bottomY, stepY);
    const diagonals = [];
    const registry = createConnectionRegistry(stepY);

    for (const b of bridges) registry.registerBridge(b);

    const minRowGap = 1;
    const maxDiagonals = Math.max(2, Math.floor(rows.length * 0.4));
    const candidates = [];

    for (let index = 0; index < count - 1; index++) {
      for (let li = 0; li < rows.length; li++) {
        for (let gap = minRowGap; gap <= 2; gap++) {
          if (li + gap < rows.length) {
            candidates.push({ index, yLeft: rows[li], yRight: rows[li + gap] });
          }
          if (li - gap >= 0) {
            candidates.push({ index, yLeft: rows[li], yRight: rows[li - gap] });
          }
        }
      }
    }

    for (const cand of shuffle(candidates)) {
      if (diagonals.length >= maxDiagonals) break;
      if (Math.abs(cand.yLeft - cand.yRight) < stepY * minRowGap - EPS) continue;
      if (registry.tryRegisterDiagonal(cand)) diagonals.push(cand);
    }

    return diagonals;
  }

  function computeLayout(count, complexity) {
    const { perLine } = getComplexityConfig(complexity);
    const canvasWidth = Math.max(MIN_WIDTH, count * PER_COLUMN + SIDE_PADDING);
    const bottomY = CANVAS_HEIGHT - BOTTOM_MARGIN;
    const stepY = computeStepY(count, perLine, bottomY);
    const gap = canvasWidth / (count + 1);
    const lineXs = Array.from({ length: count }, (_, i) => gap * (i + 1));
    return { canvasWidth, canvasHeight: CANVAS_HEIGHT, bottomY, lineXs, topY: TOP_Y, stepY, perLine };
  }

  function createGame(rawItems, complexity) {
    const count = rawItems.length;
    const config = getComplexityConfig(complexity);
    const layout = computeLayout(count, complexity);
    const bridges = generateBridges(
      count,
      config.perLine,
      layout.topY,
      layout.bottomY,
      layout.stepY
    );
    const diagonals = config.diagonals
      ? generateDiagonals(count, bridges, layout.topY, layout.bottomY, layout.stepY)
      : [];

    return {
      labels: Array.from({ length: count }, (_, i) => String(i + 1)),
      results: shuffle(rawItems),
      bridges,
      diagonals,
      complexity,
      complexityLabel: config.label,
      perLine: config.perLine,
      count,
      ...layout,
    };
  }

  function perColumnWidth(lineXs) {
    if (lineXs.length < 2) return PER_COLUMN;
    return lineXs[1] - lineXs[0];
  }

  function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + "…";
  }

  /** 다음으로 만나는 가로줄·사선 (아래 방향) */
  function findNextEvent(state, col, y) {
    const { bridges, diagonals = [] } = state;
    let best = null;

    function consider(eventY, action) {
      if (eventY <= y + EPS) return;
      if (!best || eventY < best.y - EPS) best = { y: eventY, action };
    }

    for (const b of bridges) {
      if (b.index === col) {
        consider(b.y, { kind: "horizontal", toCol: col + 1, endY: b.y });
      }
      if (b.index === col - 1) {
        consider(b.y, { kind: "horizontal", toCol: col - 1, endY: b.y });
      }
    }

    for (const d of diagonals) {
      if (d.index === col && d.yLeft < d.yRight) {
        consider(d.yLeft, {
          kind: "diagonal",
          toCol: col + 1,
          endY: d.yRight,
          yLeft: d.yLeft,
          yRight: d.yRight,
        });
      }
      if (d.index === col - 1 && d.yLeft > d.yRight) {
        consider(d.yRight, {
          kind: "diagonal",
          toCol: col - 1,
          endY: d.yLeft,
          yLeft: d.yLeft,
          yRight: d.yRight,
        });
      }
    }

    return best;
  }

  function trace(state, startIndex) {
    const { lineXs, bottomY } = state;
    let col = startIndex;
    let y = state.topY;
    const path = [{ x: lineXs[col], y }];

    while (y < bottomY - EPS) {
      const event = findNextEvent(state, col, y);

      if (!event) {
        path.push({ x: lineXs[col], y: bottomY });
        break;
      }

      if (event.y > bottomY) {
        path.push({ x: lineXs[col], y: bottomY });
        break;
      }

      path.push({ x: lineXs[col], y: event.y });

      const { action } = event;
      if (action.kind === "horizontal") {
        col = action.toCol;
        path.push({ x: lineXs[col], y: action.endY });
        y = action.endY;
      } else {
        col = action.toCol;
        path.push({ x: lineXs[col], y: action.endY });
        y = action.endY;
      }
    }

    return { path, endIndex: col };
  }

  function drawPathOverlay(ctx, partialPath, dot) {
    if (partialPath.length > 1) {
      ctx.strokeStyle = COLORS.path;
      ctx.lineWidth = PATH_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(partialPath[0].x, partialPath[0].y);
      for (let i = 1; i < partialPath.length; i++) ctx.lineTo(partialPath[i].x, partialPath[i].y);
      ctx.stroke();
    }

    if (dot) {
      ctx.fillStyle = COLORS.path;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, PATH_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.pathDotStroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function drawLadder(ctx, state, pathOption = null) {
    const { labels, results, bridges, diagonals = [], lineXs, topY, bottomY } = state;
    const canvas = ctx.canvas;

    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const colW = perColumnWidth(lineXs);

    for (let i = 0; i < labels.length; i++) {
      const x = lineXs[i];

      ctx.fillStyle = COLORS.badge;
      ctx.beginPath();
      ctx.arc(x, BADGE_Y, BADGE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.badgeText;
      ctx.font = `bold ${BADGE_FONT}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], x, BADGE_Y);

      ctx.fillStyle = COLORS.resultText;
      ctx.font = `600 ${RESULT_FONT}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
      ctx.fillText(truncateText(ctx, results[i], colW - 12), x, bottomY + RESULT_OFFSET);

      ctx.strokeStyle = COLORS.rail;
      ctx.lineWidth = RAIL_WIDTH;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.diagonal;
    ctx.lineWidth = DIAGONAL_WIDTH;
    ctx.lineCap = "round";
    for (const d of diagonals) {
      ctx.beginPath();
      ctx.moveTo(lineXs[d.index], d.yLeft);
      ctx.lineTo(lineXs[d.index + 1], d.yRight);
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.bridge;
    ctx.lineWidth = BRIDGE_WIDTH;
    for (const b of bridges) {
      ctx.beginPath();
      ctx.moveTo(lineXs[b.index], b.y);
      ctx.lineTo(lineXs[b.index + 1], b.y);
      ctx.stroke();
    }

    if (!pathOption) return;

    if (Array.isArray(pathOption)) {
      drawPathOverlay(ctx, pathOption, pathOption.length ? pathOption[pathOption.length - 1] : null);
      return;
    }

    drawPathOverlay(ctx, pathOption.partialPath || [], pathOption.dot);
  }

  function buildPathSegments(path) {
    const segments = [];
    let totalLen = 0;
    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1];
      const to = path[i];
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      segments.push({ from, to, len, start: totalLen });
      totalLen += len;
    }
    return { segments, totalLen };
  }

  function samplePath(path, segments, totalLen, dist) {
    const partialPath = [path[0]];
    let dot = { ...path[0] };

    if (dist <= 0) return { partialPath, dot };

    for (const seg of segments) {
      const segEnd = seg.start + seg.len;
      if (dist >= segEnd - EPS) {
        partialPath.push({ ...seg.to });
        dot = { ...seg.to };
        continue;
      }
      if (dist > seg.start) {
        const t = seg.len > 0 ? (dist - seg.start) / seg.len : 1;
        dot = {
          x: seg.from.x + (seg.to.x - seg.from.x) * t,
          y: seg.from.y + (seg.to.y - seg.from.y) * t,
        };
        partialPath.push(dot);
        break;
      }
      break;
    }

    return { partialPath, dot };
  }

  function animateTrace(ctx, state, startIndex, { speed = 1200, onComplete } = {}) {
    const { path, endIndex } = trace(state, startIndex);
    const startPoint = { x: state.lineXs[startIndex], y: BADGE_Y };
    const fullPath = [startPoint, ...path];
    const { segments, totalLen } = buildPathSegments(fullPath);
    let animId = null;
    let startTime = null;

    function cancel() {
      if (animId !== null) cancelAnimationFrame(animId);
      animId = null;
      startTime = null;
    }

    function frame(ts) {
      if (startTime === null) startTime = ts;
      const elapsed = (ts - startTime) / 1000;
      const dist = Math.min(totalLen, elapsed * speed);
      const sample = samplePath(fullPath, segments, totalLen, dist);

      drawLadder(ctx, state, { partialPath: sample.partialPath, dot: sample.dot });

      if (dist < totalLen - EPS) {
        animId = requestAnimationFrame(frame);
      } else {
        drawLadder(ctx, state, { partialPath: fullPath, dot: fullPath[fullPath.length - 1] });
        animId = null;
        onComplete?.(endIndex);
      }
    }

    return {
      start() {
        cancel();
        drawLadder(ctx, state, { partialPath: [fullPath[0]], dot: fullPath[0] });
        animId = requestAnimationFrame(frame);
      },
      cancel,
      path,
      endIndex,
    };
  }

  return {
    createGame,
    drawLadder,
    trace,
    animateTrace,
    perColumnWidth,
    getComplexityConfig,
    COMPLEXITY_LEVELS,
  };
})();

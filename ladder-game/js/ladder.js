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

  function resolveRandom(options) {
    if (options && typeof options.rng === "function") return options.rng;
    return Math.random;
  }

  function shuffle(arr, random) {
    const rnd = typeof random === "function" ? random : Math.random;
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function emptyGenStats() {
    return {
      attemptCount: 0,
      crossCandidateCount: 0,
      acceptedCrossCount: 0,
      rejectedByEndpoint: 0,
      rejectedByRailInterval: 0,
      rejectedByCrossOverlap: 0,
      fallbackUsed: false,
      fallbackKind: null,
    };
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

  function computeStepY(count, perLine, bottomY, topY, scale = 1) {
    const targetRows = Math.ceil((count * perLine) / 2) + 1;
    const usable = bottomY - topY - 32 * scale;
    return Math.max(22 * scale, Math.min(46 * scale, Math.floor(usable / targetRows)));
  }

  function generateBridges(count, perLine, topY, bottomY, stepY, random) {
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
      return shuffle(indices, random);
    }

    let stuck = 0;
    while (!allSatisfied() && stuck < 80) {
      const indices = candidateIndices();
      const freeRows = rows.filter(y => !usedRows.has(y));
      if (indices.length === 0 || freeRows.length === 0) break;

      let placed = false;
      for (const index of indices) {
        for (const y of shuffle(freeRows, random)) {
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

  function intervalsOverlap(a0, a1, b0, b1) {
    return a0 < b1 - EPS && b0 < a1 - EPS;
  }

  function createConnectionRegistry(stepY) {
    const minGap = stepY * 0.65;
    const byCol = new Map();
    const railIntervals = new Map();
    const stats = {
      rejectedByEndpoint: 0,
      rejectedByRailInterval: 0,
      rejectedByCrossOverlap: 0,
    };

    function colPoints(col) {
      if (!byCol.has(col)) byCol.set(col, []);
      return byCol.get(col);
    }

    function colIntervals(col) {
      if (!railIntervals.has(col)) railIntervals.set(col, []);
      return railIntervals.get(col);
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

    function pointInsideOpenInterval(y, startY, endY) {
      return y > startY + EPS && y < endY - EPS;
    }

    function railHasInteriorPoint(rail, startY, endY) {
      return colPoints(rail).some(function (y) {
        return pointInsideOpenInterval(y, startY, endY);
      });
    }

    function railHasOverlappingInterval(rail, startY, endY) {
      return colIntervals(rail).some(function (occ) {
        return intervalsOverlap(startY, endY, occ.startY, occ.endY);
      });
    }

    function tryRegisterCross(cross) {
      if (!(cross.bottomY > cross.topY + EPS)) return false;

      const rails = [cross.index, cross.index + 1];

      for (let i = 0; i < rails.length; i++) {
        if (!canAttach(rails[i], cross.topY) || !canAttach(rails[i], cross.bottomY)) {
          stats.rejectedByEndpoint += 1;
          return false;
        }
      }

      for (let i = 0; i < rails.length; i++) {
        if (railHasOverlappingInterval(rails[i], cross.topY, cross.bottomY)) {
          stats.rejectedByCrossOverlap += 1;
          return false;
        }
        if (railHasInteriorPoint(rails[i], cross.topY, cross.bottomY)) {
          stats.rejectedByRailInterval += 1;
          return false;
        }
      }

      for (let i = 0; i < rails.length; i++) {
        attach(rails[i], cross.topY);
        attach(rails[i], cross.bottomY);
        colIntervals(rails[i]).push({
          startY: cross.topY,
          endY: cross.bottomY,
          connectorId: "c:" + cross.index + ":" + cross.topY + ":" + cross.bottomY,
        });
      }
      return true;
    }

    return { registerBridge, tryRegisterCross, stats };
  }

  function computeMaxCrosses(count, rowCount, targetScale) {
    const pairs = Math.max(1, count - 1);
    let target;
    if (count <= 4) {
      target = Math.max(1, Math.min(pairs, count <= 2 ? 1 : 2));
    } else if (count <= 8) {
      target = Math.min(pairs, Math.max(2, Math.round(count * 0.5)));
    } else if (count <= 14) {
      target = Math.min(pairs, Math.max(3, Math.round(count * 0.4)));
    } else {
      target = Math.min(8, Math.max(4, Math.round(pairs * 0.35)));
    }
    const rowCap = Math.max(1, Math.floor(rowCount * 0.32));
    const max = Math.max(1, Math.min(target, rowCap));
    return Math.max(1, Math.round(max * (targetScale || 1)));
  }

  function generateDiagonals(count, bridges, topY, bottomY, stepY, options) {
    const random = resolveRandom(options);
    const targetScale = options && options.targetScale != null ? options.targetScale : 1;
    const rows = getBridgeRows(topY, bottomY, stepY);
    const diagonals = [];
    const registry = createConnectionRegistry(stepY);
    const stats = {
      crossCandidateCount: 0,
      acceptedCrossCount: 0,
      rejectedByEndpoint: 0,
      rejectedByRailInterval: 0,
      rejectedByCrossOverlap: 0,
    };

    for (const b of bridges) registry.registerBridge(b);

    const maxDiagonals = computeMaxCrosses(count, rows.length, targetScale);
    const buckets = Array.from({ length: Math.max(0, count - 1) }, function () { return []; });

    for (let index = 0; index < count - 1; index++) {
      for (let li = 0; li < rows.length; li++) {
        for (let gap = 1; gap <= 2; gap++) {
          if (li + gap >= rows.length) continue;
          const cand = {
            type: "cross",
            index,
            topY: rows[li],
            bottomY: rows[li + gap],
          };
          if (cand.bottomY - cand.topY < stepY - EPS) continue;
          buckets[index].push(cand);
          stats.crossCandidateCount += 1;
        }
      }
    }

    for (let i = 0; i < buckets.length; i++) {
      buckets[i] = shuffle(buckets[i], random);
    }

    let progress = true;
    while (diagonals.length < maxDiagonals && progress) {
      progress = false;
      for (let i = 0; i < buckets.length && diagonals.length < maxDiagonals; i++) {
        while (buckets[i].length) {
          const cand = buckets[i].pop();
          if (registry.tryRegisterCross(cand)) {
            diagonals.push(cand);
            progress = true;
            break;
          }
        }
      }
    }

    stats.acceptedCrossCount = diagonals.length;
    stats.rejectedByEndpoint = registry.stats.rejectedByEndpoint;
    stats.rejectedByRailInterval = registry.stats.rejectedByRailInterval;
    stats.rejectedByCrossOverlap = registry.stats.rejectedByCrossOverlap;
    return { diagonals, stats };
  }

  function computeLayout(count, complexity, viewport = null) {
    const { perLine } = getComplexityConfig(complexity);
    let layoutScale = 1;
    let canvasWidth = Math.max(MIN_WIDTH, count * PER_COLUMN + SIDE_PADDING);
    let canvasHeight = CANVAS_HEIGHT;

    if (viewport && viewport.width > 0 && viewport.height > 0) {
      const maxW = viewport.width * 0.96;
      const maxH = viewport.height * 0.96;
      layoutScale = maxH / CANVAS_HEIGHT;
      canvasHeight = Math.round(maxH);
      const minW = Math.max(
        MIN_WIDTH * layoutScale,
        count * PER_COLUMN * layoutScale + SIDE_PADDING * layoutScale
      );
      canvasWidth = Math.round(Math.min(maxW, Math.max(minW, maxW * 0.94)));
    }

    const topY = TOP_Y * layoutScale;
    const bottomY = canvasHeight - BOTTOM_MARGIN * layoutScale;
    const stepY = computeStepY(count, perLine, bottomY, topY, layoutScale);
    const gap = canvasWidth / (count + 1);
    const lineXs = Array.from({ length: count }, (_, i) => gap * (i + 1));
    return {
      canvasWidth,
      canvasHeight,
      bottomY,
      lineXs,
      topY,
      stepY,
      perLine,
      layoutScale,
    };
  }

  function createGame(rawItems, complexity, viewport = null, options) {
    options = options || {};
    const random = resolveRandom(options);
    const count = rawItems.length;
    if (count < 2) {
      throw new Error("LadderGame.createGame: at least 2 results are required");
    }

    const requestedComplexity = complexity;
    const config = getComplexityConfig(complexity);
    const layout = computeLayout(count, complexity, viewport);
    const stats = emptyGenStats();
    const wantCross = !!config.diagonals;

    function build(crossMode) {
      stats.attemptCount += 1;
      const bridges = generateBridges(
        count,
        config.perLine,
        layout.topY,
        layout.bottomY,
        layout.stepY,
        random
      );

      let diagonals = [];
      if (crossMode === "full" || crossMode === "reduced") {
        const generated = generateDiagonals(
          count,
          bridges,
          layout.topY,
          layout.bottomY,
          layout.stepY,
          { rng: random, targetScale: crossMode === "reduced" ? 0.45 : 1 }
        );
        diagonals = generated.diagonals;
        stats.crossCandidateCount = generated.stats.crossCandidateCount;
        stats.acceptedCrossCount = generated.stats.acceptedCrossCount;
        stats.rejectedByEndpoint = generated.stats.rejectedByEndpoint;
        stats.rejectedByRailInterval = generated.stats.rejectedByRailInterval;
        stats.rejectedByCrossOverlap = generated.stats.rejectedByCrossOverlap;
      } else {
        stats.acceptedCrossCount = 0;
      }

      const game = {
        labels: Array.from({ length: count }, (_, i) => String(i + 1)),
        results: shuffle(rawItems, random),
        bridges,
        diagonals,
        complexity: requestedComplexity,
        complexityLabel: config.label,
        perLine: config.perLine,
        count,
        ...layout,
      };

      return game;
    }

    function accept(game, fallbackKind) {
      if (fallbackKind) {
        stats.fallbackUsed = true;
        stats.fallbackKind = fallbackKind;
        if (typeof console !== "undefined" && console.warn) {
          console.warn("LadderGame: topology fallback used (" + fallbackKind + ")");
        }
      }
      if (options.debug) game._debug = Object.assign({}, stats);
      return game;
    }

    const phases = wantCross
      ? [
          { mode: "full", attempts: 24, fallback: null },
          { mode: "reduced", attempts: 12, fallback: "reduced-cross" },
          { mode: "none", attempts: 12, fallback: "horizontal-only" },
        ]
      : [{ mode: "none", attempts: 24, fallback: null }];

    for (const phase of phases) {
      for (let i = 0; i < phase.attempts; i++) {
        const game = build(phase.mode);
        if (validateGame(game).ok) return accept(game, phase.fallback);
      }
    }

    throw new Error("LadderGame.createGame: failed to generate a valid ladder");
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

  function bridgeKey(b) {
    return `h:${b.index}:${b.y}`;
  }

  function diagonalKey(d) {
    return `c:${d.index}:${d.topY}:${d.bottomY}`;
  }

  /** 다음으로 만나는 가로줄·X-Cross (아래 방향, topY에서만 진입) */
  function findNextEvent(state, col, y, used) {
    const { bridges, diagonals = [] } = state;
    let best = null;

    function consider(eventY, action, key) {
      if (used.has(key)) return;
      if (eventY < y - EPS) return;
      if (!best || eventY < best.y - EPS) best = { y: eventY, action, key };
    }

    for (const b of bridges) {
      const key = bridgeKey(b);
      if (b.index === col) {
        consider(b.y, { kind: "horizontal", toCol: col + 1, endY: b.y }, key);
      }
      if (b.index === col - 1) {
        consider(b.y, { kind: "horizontal", toCol: col - 1, endY: b.y }, key);
      }
    }

    for (const d of diagonals) {
      if (!(d.bottomY > d.topY + EPS)) continue;
      const key = diagonalKey(d);
      if (d.index === col) {
        consider(d.topY, { kind: "cross", toCol: col + 1, endY: d.bottomY }, key);
      }
      if (d.index === col - 1) {
        consider(d.topY, { kind: "cross", toCol: col - 1, endY: d.bottomY }, key);
      }
    }

    return best;
  }

  function trace(state, startIndex) {
    const { lineXs, bottomY, count } = state;
    let col = startIndex;
    let y = state.topY;
    const path = [{ x: lineXs[col], y }];
    const used = new Set();
    const errors = [];
    const maxSteps = ((state.bridges || []).length + (state.diagonals || []).length) * 4 + 16;
    let steps = 0;

    while (y < bottomY - EPS) {
      if (++steps > maxSteps) {
        errors.push({ code: "infinite_loop", startIndex, col, y });
        path.push({ x: lineXs[Math.max(0, Math.min(col, lineXs.length - 1))], y: bottomY });
        break;
      }

      const event = findNextEvent(state, col, y, used);

      if (!event) {
        path.push({ x: lineXs[col], y: bottomY });
        break;
      }

      if (event.y > bottomY) {
        path.push({ x: lineXs[col], y: bottomY });
        break;
      }

      used.add(event.key);
      path.push({ x: lineXs[col], y: event.y });

      const { action } = event;
      if (action.endY < y - EPS) {
        errors.push({
          code: "upward",
          startIndex,
          fromY: y,
          toY: action.endY,
          kind: action.kind,
        });
      }

      col = action.toCol;
      path.push({ x: lineXs[col], y: action.endY });
      y = action.endY;
    }

    if (col < 0 || col >= count) {
      errors.push({ code: "invalid_end_index", startIndex, endIndex: col });
    }

    return { path, endIndex: col, errors, usedConnectors: Array.from(used) };
  }

  function connectorTouchesRail(index, rail) {
    return index === rail || index + 1 === rail;
  }

  function validateConnectorUsageAndTopology(state, traces, errors) {
    const usage = new Map();
    for (let i = 0; i < traces.length; i++) {
      const keys = traces[i].usedConnectors || [];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        usage.set(key, (usage.get(key) || 0) + 1);
      }
    }

    for (const b of state.bridges || []) {
      const key = bridgeKey(b);
      const n = usage.get(key) || 0;
      if (n !== 2) {
        errors.push({ code: "connector_usage", kind: "horizontal", key, count: n });
      }
    }

    for (const d of state.diagonals || []) {
      const key = diagonalKey(d);
      const n = usage.get(key) || 0;
      if (n !== 2) {
        errors.push({ code: "connector_usage", kind: "cross", key, count: n });
      }
    }

    const diagonals = state.diagonals || [];
    const bridges = state.bridges || [];

    for (let i = 0; i < diagonals.length; i++) {
      const d = diagonals[i];
      if (!(d.bottomY > d.topY + EPS)) {
        errors.push({ code: "invalid_cross", cross: d });
        continue;
      }
      if (d.index < 0 || d.index >= state.count - 1) {
        errors.push({ code: "invalid_cross_index", cross: d });
      }
      if (d.topY < state.topY - 1 || d.bottomY > state.bottomY + 1) {
        errors.push({ code: "cross_out_of_bounds", cross: d });
      }

      for (const rail of [d.index, d.index + 1]) {
        for (const b of bridges) {
          if (!connectorTouchesRail(b.index, rail)) continue;
          if (b.y > d.topY + EPS && b.y < d.bottomY - EPS) {
            errors.push({
              code: "interval_conflict",
              kind: "bridge",
              rail,
              cross: d,
              bridge: b,
            });
          }
        }
        for (let j = 0; j < diagonals.length; j++) {
          if (i === j) continue;
          const other = diagonals[j];
          if (!connectorTouchesRail(other.index, rail)) continue;
          if (intervalsOverlap(d.topY, d.bottomY, other.topY, other.bottomY)) {
            errors.push({
              code: "interval_conflict",
              kind: "cross",
              rail,
              cross: d,
              other,
            });
          }
        }
      }
    }
  }

  function validateGame(state) {
    const errors = [];
    const n = state.count;
    const endIndices = [];
    const traces = [];

    for (let i = 0; i < n; i++) {
      const result = trace(state, i);
      traces.push(result);
      for (const err of result.errors) errors.push(err);

      for (let p = 1; p < result.path.length; p++) {
        if (result.path[p].y < result.path[p - 1].y - EPS) {
          errors.push({
            code: "upward_segment",
            startIndex: i,
            fromY: result.path[p - 1].y,
            toY: result.path[p].y,
          });
        }
      }

      const last = result.path[result.path.length - 1];
      if (!last || Math.abs(last.y - state.bottomY) > 1) {
        errors.push({ code: "not_bottom", startIndex: i, y: last && last.y });
      }

      if (result.endIndex < 0 || result.endIndex >= n) {
        errors.push({ code: "invalid_end_index", startIndex: i, endIndex: result.endIndex });
      }

      endIndices.push(result.endIndex);
    }

    if (new Set(endIndices).size !== n) {
      errors.push({ code: "duplicate_destination", endIndices });
    }

    validateConnectorUsageAndTopology(state, traces, errors);

    return { ok: errors.length === 0, errors, endIndices };
  }

  function drawPathOverlay(ctx, partialPath, dot, scale = 1) {
    if (partialPath.length > 1) {
      ctx.strokeStyle = COLORS.path;
      ctx.lineWidth = PATH_WIDTH * scale;
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
      ctx.arc(dot.x, dot.y, PATH_DOT_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.pathDotStroke;
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
    }
  }

  function drawLadder(ctx, state, pathOption = null) {
    const { labels, results, bridges, diagonals = [], lineXs, topY, bottomY } = state;
    const s = state.layoutScale || 1;
    const badgeY = BADGE_Y * s;
    const canvas = ctx.canvas;

    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const colW = perColumnWidth(lineXs);

    for (let i = 0; i < labels.length; i++) {
      const x = lineXs[i];

      ctx.fillStyle = COLORS.badge;
      ctx.beginPath();
      ctx.arc(x, badgeY, BADGE_RADIUS * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.badgeText;
      ctx.font = `bold ${Math.round(BADGE_FONT * s)}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], x, badgeY);

      ctx.fillStyle = COLORS.resultText;
      ctx.font = `600 ${Math.round(RESULT_FONT * s)}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
      ctx.fillText(truncateText(ctx, results[i], colW - 12 * s), x, bottomY + RESULT_OFFSET * s);

      ctx.strokeStyle = COLORS.rail;
      ctx.lineWidth = RAIL_WIDTH * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.diagonal;
    ctx.lineWidth = DIAGONAL_WIDTH * s;
    ctx.lineCap = "round";
    for (const d of diagonals) {
      const xL = lineXs[d.index];
      const xR = lineXs[d.index + 1];
      const mx = (xL + xR) / 2;
      const my = (d.topY + d.bottomY) / 2;

      ctx.beginPath();
      ctx.moveTo(xL, d.topY);
      ctx.lineTo(xR, d.bottomY);
      ctx.stroke();

      const dx = xL - xR;
      const dy = d.bottomY - d.topY;
      const len = Math.hypot(dx, dy) || 1;
      const gap = Math.min(6 * s, len * 0.08);
      const ux = dx / len;
      const uy = dy / len;
      ctx.beginPath();
      ctx.moveTo(xR, d.topY);
      ctx.lineTo(mx - ux * gap, my - uy * gap);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx + ux * gap, my + uy * gap);
      ctx.lineTo(xL, d.bottomY);
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.bridge;
    ctx.lineWidth = BRIDGE_WIDTH * s;
    for (const b of bridges) {
      ctx.beginPath();
      ctx.moveTo(lineXs[b.index], b.y);
      ctx.lineTo(lineXs[b.index + 1], b.y);
      ctx.stroke();
    }

    if (!pathOption) return;

    if (Array.isArray(pathOption)) {
      drawPathOverlay(ctx, pathOption, pathOption.length ? pathOption[pathOption.length - 1] : null, s);
      return;
    }

    drawPathOverlay(ctx, pathOption.partialPath || [], pathOption.dot, s);
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
    const badgeY = BADGE_Y * (state.layoutScale || 1);
    const startPoint = { x: state.lineXs[startIndex], y: badgeY };
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
    validateGame,
    animateTrace,
    perColumnWidth,
    getComplexityConfig,
    COMPLEXITY_LEVELS,
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.LadderGame = LadderGame;
}

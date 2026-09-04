import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dir = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(dir, 'ladder.js'), 'utf8');
const context = { console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context);
const { LadderGame } = context;

function items(n) {
  return Array.from({ length: n }, (_, i) => 'R' + (i + 1));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bridgeKey(b) {
  return 'h:' + b.index + ':' + b.y;
}

function diagonalKey(d) {
  return 'c:' + d.index + ':' + d.topY + ':' + d.bottomY;
}

function touchesRail(index, rail) {
  return index === rail || index + 1 === rail;
}

function intervalsOverlap(a0, a1, b0, b1) {
  return a0 < b1 && b0 < a1;
}

function inspectGame(game, seedLabel) {
  const prefix = seedLabel || 'game';
  const n = game.count;
  const endIndices = [];
  const usage = new Map();
  const EPS = 0.5;

  for (let i = 0; i < n; i++) {
    const result = LadderGame.trace(game, i);
    assert.equal(result.errors.length, 0, prefix + ' trace errors start=' + i + ' ' + JSON.stringify(result.errors));

    for (let p = 1; p < result.path.length; p++) {
      assert.ok(
        result.path[p].y + EPS >= result.path[p - 1].y,
        prefix + ' upward y at start=' + i
      );
    }

    const last = result.path[result.path.length - 1];
    assert.ok(last, prefix + ' missing path');
    assert.ok(Math.abs(last.y - game.bottomY) <= 1, prefix + ' did not reach bottom');
    assert.ok(result.endIndex >= 0 && result.endIndex < n, prefix + ' endIndex out of range');
    endIndices.push(result.endIndex);

    for (const key of result.usedConnectors || []) {
      usage.set(key, (usage.get(key) || 0) + 1);
    }
  }

  assert.equal(new Set(endIndices).size, n, prefix + ' duplicate destinations ' + endIndices.join(','));

  for (const b of game.bridges || []) {
    const key = bridgeKey(b);
    assert.equal(usage.get(key) || 0, 2, prefix + ' horizontal usage ' + key);
  }

  for (const d of game.diagonals || []) {
    assert.equal(d.type, 'cross', prefix + ' missing cross type');
    assert.ok(d.bottomY > d.topY, prefix + ' bottomY <= topY');
    assert.ok(d.index >= 0 && d.index < n - 1, prefix + ' cross index');
    assert.ok(d.topY >= game.topY - 1 && d.bottomY <= game.bottomY + 1, prefix + ' cross bounds');
    assert.equal(usage.get(diagonalKey(d)) || 0, 2, prefix + ' cross usage ' + diagonalKey(d));

    for (const rail of [d.index, d.index + 1]) {
      for (const b of game.bridges || []) {
        if (!touchesRail(b.index, rail)) continue;
        assert.ok(
          !(b.y > d.topY && b.y < d.bottomY),
          prefix + ' bridge inside cross interval rail=' + rail
        );
      }
      for (const other of game.diagonals || []) {
        if (other === d) continue;
        if (!touchesRail(other.index, rail)) continue;
        assert.ok(
          !intervalsOverlap(d.topY, d.bottomY, other.topY, other.bottomY),
          prefix + ' overlapping crosses on rail ' + rail
        );
      }
    }
  }

  return endIndices;
}

describe('ladder X-Cross events', function () {
  it('creates cross events with bottomY > topY', function () {
    let sawCross = false;
    for (let i = 0; i < 40; i++) {
      const game = LadderGame.createGame(items(6), 5, null, { rng: mulberry32(1000 + i) });
      for (const d of game.diagonals) {
        assert.equal(d.type, 'cross');
        assert.ok(d.bottomY > d.topY);
        assert.ok(d.index >= 0 && d.index < game.count - 1);
        sawCross = true;
      }
    }
    assert.equal(sawCross, true, 'expected some X-cross events at complexity 5');
  });

  it('keeps shared-rail cross intervals disjoint', function () {
    for (let i = 0; i < 80; i++) {
      const game = LadderGame.createGame(items(8), 5, null, { rng: mulberry32(2000 + i) });
      inspectGame(game, 'disjoint-' + i);
    }
  });

  it('treats an X-cross as an adjacent swap entered only at topY', function () {
    const game = LadderGame.createGame(items(3), 1);
    game.bridges = [];
    game.diagonals = [{
      type: 'cross',
      index: 0,
      topY: game.topY + 50,
      bottomY: game.topY + 140,
    }];

    const left = LadderGame.trace(game, 0);
    const right = LadderGame.trace(game, 1);
    const untouched = LadderGame.trace(game, 2);

    assert.equal(left.endIndex, 1);
    assert.equal(right.endIndex, 0);
    assert.equal(untouched.endIndex, 2);
    assert.equal(left.errors.length, 0);
    assert.equal(right.errors.length, 0);
    assert.deepEqual(left.usedConnectors.sort(), right.usedConnectors.sort());
    assert.equal(LadderGame.validateGame(game).ok, true);
  });

  it('flags a bridge inside a reserved cross interval', function () {
    const game = LadderGame.createGame(items(4), 1);
    game.bridges = [{ index: 1, y: (game.topY + game.bottomY) / 2 }];
    game.diagonals = [{
      type: 'cross',
      index: 0,
      topY: game.topY + 20,
      bottomY: game.bottomY - 20,
    }];
    const result = LadderGame.validateGame(game);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((err) => err.code === 'interval_conflict' || err.code === 'connector_usage'));
  });

  it('never returns an invalid board', function () {
    for (let n = 2; n <= 8; n++) {
      const game = LadderGame.createGame(items(n), 5, null, { rng: mulberry32(n * 99), debug: true });
      assert.equal(LadderGame.validateGame(game).ok, true);
    }
  });
});

describe('ladder independent property tests', function () {
  it('holds topology properties across counts, complexities, and viewports', function () {
    const viewports = [
      null,
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 768 },
      { width: 2560, height: 1440 },
      { width: 800, height: 520 },
    ];

    let games = 0;
    let withCrosses = 0;
    let attemptSum = 0;
    let attemptMax = 0;
    let fallbacks = 0;
    let failures = 0;

    for (let n = 2; n <= 20; n++) {
      for (let complexity = 1; complexity <= 5; complexity++) {
        for (let v = 0; v < viewports.length; v++) {
          const seed = n * 100000 + complexity * 1000 + v * 17 + 42;
          try {
            const game = LadderGame.createGame(items(n), complexity, viewports[v], {
              rng: mulberry32(seed),
              debug: true,
            });
            inspectGame(game, 'seed=' + seed);
            games += 1;
            if (game.diagonals && game.diagonals.length) withCrosses += 1;
            if (game._debug) {
              attemptSum += game._debug.attemptCount;
              if (game._debug.attemptCount > attemptMax) attemptMax = game._debug.attemptCount;
              if (game._debug.fallbackUsed) fallbacks += 1;
            }
          } catch (err) {
            failures += 1;
            throw new Error('seed=' + seed + ' n=' + n + ' c=' + complexity + ' ' + err.message);
          }
        }
      }
    }

    assert.equal(failures, 0);
    assert.ok(games >= 500, 'expected a large property matrix, got ' + games);
    assert.ok(withCrosses > 0, 'no X-cross games in the matrix');

    globalThis.__ladderPropertyStats = {
      games,
      withCrosses,
      attemptAvg: attemptSum / games,
      attemptMax,
      fallbacks,
    };
  });
});

describe('ladder random generation stress', function () {
  it('generates thousands of seeded games with independent invariants', function () {
    const extra = 6000;
    let upward = 0;
    let duplicate = 0;
    let infinite = 0;
    let usage = 0;
    let conflict = 0;
    let other = 0;
    let withCrosses = 0;
    let attemptSum = 0;
    let attemptMax = 0;
    let fallbacks = 0;

    for (let i = 0; i < extra; i++) {
      const n = 2 + (i % 19);
      const complexity = 1 + (i % 5);
      const seed = 900000 + i * 997;
      const game = LadderGame.createGame(items(n), complexity, null, {
        rng: mulberry32(seed),
        debug: true,
      });

      if (game.diagonals && game.diagonals.length) withCrosses += 1;
      if (game._debug) {
        attemptSum += game._debug.attemptCount;
        if (game._debug.attemptCount > attemptMax) attemptMax = game._debug.attemptCount;
        if (game._debug.fallbackUsed) fallbacks += 1;
      }

      try {
        inspectGame(game, 'stress-seed=' + seed);
      } catch (err) {
        const result = LadderGame.validateGame(game);
        for (const item of result.errors) {
          if (item.code === 'upward' || item.code === 'upward_segment') upward += 1;
          else if (item.code === 'duplicate_destination') duplicate += 1;
          else if (item.code === 'infinite_loop') infinite += 1;
          else if (item.code === 'connector_usage') usage += 1;
          else if (item.code === 'interval_conflict') conflict += 1;
          else other += 1;
        }
        throw err;
      }
    }

    const property = globalThis.__ladderPropertyStats || { games: 0, attemptAvg: 0, attemptMax: 0, fallbacks: 0 };
    const totalGames = extra + property.games;
    const totalAttempts = attemptSum + (property.attemptAvg || 0) * property.games;
    const maxAttempt = Math.max(attemptMax, property.attemptMax || 0);
    const totalFallback = fallbacks + (property.fallbacks || 0);

    console.log(
      JSON.stringify({
        totalGames,
        withCrosses: withCrosses + (property.withCrosses || 0),
        attemptAvg: totalAttempts / totalGames,
        attemptMax: maxAttempt,
        fallbacks: totalFallback,
        upward,
        duplicate,
        infinite,
        usage,
        conflict,
      })
    );

    assert.ok(withCrosses > 0, 'stress run produced no X-cross ladders');
    assert.equal(upward, 0);
    assert.equal(duplicate, 0);
    assert.equal(infinite, 0);
    assert.equal(usage, 0);
    assert.equal(conflict, 0);
    assert.equal(other, 0);
  });
});

const $ = (id) => document.getElementById(id);

const SOUND_BASE = "asset/sounds/";
const VOLUME = {
  bgm: 0.2,
  sfx: 0.8,
  stinger: 0.5,
};

const audio = {
  unlocked: false,
  currentBgm: null,
  sfx: {},
  bgm: {},
};

function createAudio(name, { loop = false, volume = 1 } = {}) {
  const el = new Audio();
  el.loop = loop;
  el.volume = volume;
  const exts = [".mp3", ".wav", ".ogg"];
  let extIndex = 0;

  const tryNext = () => {
    if (extIndex < exts.length) {
      el.src = SOUND_BASE + name + exts[extIndex++];
    }
  };

  el.addEventListener("error", tryNext);
  tryNext();
  return el;
}

function initAudio() {
  ["player_attack", "player_damage", "pick_card"].forEach((name) => {
    audio.sfx[name] = createAudio(name, { volume: VOLUME.sfx });
  });
  audio.sfx.boss_fail = createAudio("boss_fail", { volume: VOLUME.stinger });
  audio.sfx.victory = createAudio("victory", { volume: VOLUME.stinger });
  audio.bgm.regular = createAudio("regular_fight", { loop: true, volume: VOLUME.bgm });
  audio.bgm.boss = createAudio("boss_fight", { loop: true, volume: VOLUME.bgm });
}

function unlockAudio() {
  if (audio.unlocked) return;
  audio.unlocked = true;
  Object.values(audio.sfx).forEach((s) => s.load());
  Object.values(audio.bgm).forEach((b) => b.load());
}

function playSfx(name) {
  if (!audio.unlocked) return;
  const sound = audio.sfx[name];
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function stopBgm() {
  Object.values(audio.bgm).forEach((bgm) => {
    bgm.pause();
    bgm.currentTime = 0;
  });
  audio.currentBgm = null;
}

function playBgm(type) {
  if (!audio.unlocked) return;
  if (audio.currentBgm === type) return;

  stopBgm();
  const bgm = audio.bgm[type];
  if (!bgm) return;

  bgm.volume = VOLUME.bgm;
  bgm.play().catch(() => {});
  audio.currentBgm = type;
}

initAudio();

const MONSTER_SPRITES = ["🐸", "🦇", "👻", "🕷️", "🐺", "🦴", "🐙"];
const MONSTER_KEYS = ["slime", "bat", "ghost", "spider", "wolf", "skeleton", "octopus"];
const BOSS_SPRITE = "🐲";
const ITEM_TYPES = ["shield", "hint", "heal"];
const ITEM_ICONS = {
  shield: "🛡️",
  hint: "💡",
  heal: "❤️",
};

const uiState = {
  lastMessage: null,
  lastVictory: null,
};

const state = {
  sentences: [],
  sentenceTargets: [],
  round: 0,
  bossPhase: 0,
  sentenceIndex: 0,
  correctWords: [],
  currentIndex: 0,
  built: "",
  gauge: 0,
  enemyHp: 50,
  enemyMaxHp: 50,
  playerHp: 30,
  playerMaxHp: 30,
  inventory: [],
  shieldActive: false,
  bossInitialized: false,
};

function t(key, params) {
  return window.sbT(key, params);
}

function getMonsterName(roundIndex) {
  const key = MONSTER_KEYS[roundIndex % MONSTER_KEYS.length];
  return t(`monsters.${key}`);
}

function getBossName() {
  return t("monsters.boss");
}

function getItemMeta(type) {
  return {
    icon: ITEM_ICONS[type],
    name: t(`items.${type}.name`),
    desc: t(`items.${type}.desc`),
  };
}

function isBossRound() {
  return state.round >= state.sentences.length;
}

/** [in common] 처럼 대괄호로 묶인 부분은 카드 1장으로 처리 */
function parseSentenceToCards(sentence) {
  const cards = [];
  const regex = /\[([^\]]+)\]|(\S+)/g;
  let match;

  while ((match = regex.exec(sentence.trim())) !== null) {
    if (match[1] !== undefined) {
      const phrase = match[1].trim();
      if (phrase) cards.push(phrase);
    } else if (match[2]) {
      cards.push(match[2]);
    }
  }

  return cards;
}

function displaySentence(sentence) {
  return sentence.replace(/\[([^\]]+)\]/g, "$1");
}

function computeSentenceTargets(enemyHp, sentenceCount) {
  const base = Math.floor(enemyHp / sentenceCount);
  const remainder = enemyHp % sentenceCount;
  return Array.from({ length: sentenceCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

function calcDamage(gauge, sentenceIndex) {
  const target = state.sentenceTargets[sentenceIndex] ?? 0;
  const base = Math.round(target * 0.6);
  const bonus = Math.round(target * 0.4 * (gauge / 100));
  return { base, bonus, total: base + bonus, target };
}

function updateDamagePreview() {
  const preview = $("damage-preview");
  const bossHp = parseInt($("enemy-hp").value, 10) || 50;
  const count = state.sentences.length;

  if (count === 0) {
    preview.textContent = "";
    return;
  }

  const targets = computeSentenceTargets(bossHp, count);
  const perRound = targets
    .map((hp, i) => t("setup.roundTag", { round: i + 1, hp }))
    .join(", ");

  preview.innerHTML =
    `<strong>${t("setup.roundLayoutHeading")}</strong><br>` +
    `${t("setup.roundLayoutNormal", { count, perRound, bossHp })}<br>` +
    t("setup.roundLayoutBossNote", { count });
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(`${name}-screen`).classList.add("active");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateHpBars() {
  const enemyPct = (state.enemyHp / state.enemyMaxHp) * 100;
  const playerPct = (state.playerHp / state.playerMaxHp) * 100;
  $("enemy-fill").style.width = `${Math.max(0, enemyPct)}%`;
  $("player-fill").style.width = `${Math.max(0, playerPct)}%`;
  $("enemy-hp-text").textContent = `${Math.max(0, state.enemyHp)} / ${state.enemyMaxHp}`;
  $("player-hp-text").textContent = `${Math.max(0, state.playerHp)} / ${state.playerMaxHp}`;
}

function updateGauge() {
  const pct = Math.max(0, Math.min(100, state.gauge));
  $("gauge-fill").style.width = `${pct}%`;
  $("gauge-text").textContent = `${pct}%`;
}

function renderSentenceList() {
  const list = $("sentence-list");
  list.innerHTML = "";
  state.sentences.forEach((s, i) => {
    const cards = parseSentenceToCards(s);
    const li = document.createElement("li");
    li.innerHTML =
      `<span>${displaySentence(s)} <small class="card-count">${t("list.cardCount", { count: cards.length, cards: cards.join(" · ") })}</small></span>` +
      `<button data-i="${i}" title="${t("actions.delete")}">✕</button>`;
    list.appendChild(li);
  });
  $("hint").style.display = state.sentences.length ? "none" : "block";
  $("start-btn").disabled = state.sentences.length === 0;
  updateDamagePreview();
}

function setMessage(text, type = "") {
  const el = $("message");
  el.textContent = text;
  el.className = "message" + (type ? ` ${type}` : "");
}

function setMessageI18n(key, params = {}, type = "") {
  uiState.lastMessage = { key, params, type };
  setMessage(t(key, params), type);
}

function setupMonster(roundIndex) {
  const sprite = MONSTER_SPRITES[roundIndex % MONSTER_SPRITES.length];
  const name = getMonsterName(roundIndex);
  state.enemyMaxHp = state.sentenceTargets[roundIndex];
  state.enemyHp = state.enemyMaxHp;

  $("enemy-panel").classList.remove("boss-panel");
  $("enemy-sprite").classList.remove("defeated");
  $("enemy-sprite").textContent = sprite;
  $("monster-name").textContent = t("game.roundMonster", { round: roundIndex + 1, name });
  $("enemy-hp-label").textContent = t("labels.monsterHp");
  updateHpBars();
}

function setupBoss() {
  state.enemyMaxHp = parseInt($("enemy-hp").value, 10) || 50;
  state.enemyHp = state.enemyMaxHp;
  state.bossPhase = 0;

  $("enemy-panel").classList.add("boss-panel");
  $("enemy-sprite").classList.remove("defeated");
  $("enemy-sprite").textContent = BOSS_SPRITE;
  $("monster-name").textContent = t("game.bossRound", { name: getBossName() });
  $("enemy-hp-label").textContent = t("labels.bossHp");
  updateHpBars();
}

function grantRoundItem() {
  const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  state.inventory.push(type);
  updateInventoryUI();
  return getItemMeta(type);
}

function updateInventoryUI() {
  const list = $("inventory-list");
  const hint = $("inventory-hint");
  const canUse = isBossRound();

  list.innerHTML = "";

  if (state.inventory.length === 0) {
    hint.textContent = t("inventory.empty");
    return;
  }

  hint.textContent = canUse
    ? t("inventory.bossUse")
    : t("inventory.stored", { count: state.inventory.length });

  state.inventory.forEach((type, index) => {
    const item = getItemMeta(type);
    const btn = document.createElement("button");
    btn.className = "inventory-slot";
    btn.textContent = item.icon;
    btn.title = `${item.name}: ${item.desc}`;
    btn.disabled = !canUse;
    btn.addEventListener("click", () => useInventoryItem(index));
    list.appendChild(btn);
  });
}

function useInventoryItem(index) {
  if (!isBossRound()) return;

  const type = state.inventory[index];
  if (!type) return;

  switch (type) {
    case "shield":
      state.shieldActive = true;
      setMessageI18n("messages.shieldActive", {}, "success");
      break;
    case "hint":
      showHint();
      break;
    case "heal":
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 2);
      updateHpBars();
      setMessageI18n("messages.healUsed", {}, "success");
      break;
  }

  state.inventory.splice(index, 1);
  updateInventoryUI();
}

function showHint() {
  document.querySelectorAll(".card").forEach((c) => c.classList.remove("hinted"));
  const nextWord = state.correctWords[state.currentIndex];
  let shown = false;

  document.querySelectorAll(".card").forEach((card) => {
    if (!card.disabled && card.textContent === nextWord && !shown) {
      card.classList.add("hinted");
      shown = true;
    }
  });

  setMessageI18n(
    shown ? "messages.hintShown" : "messages.hintNone",
    {},
    "success"
  );
}

function spawnCards(words) {
  const area = $("cards");
  area.innerHTML = "";
  shuffle(words).forEach((word) => {
    const card = document.createElement("button");
    card.className = "card";
    card.textContent = word;
    card.addEventListener("click", () => onCardClick(card, word));
    area.appendChild(card);
  });
}

function updateRoundInfo(sentenceIndex) {
  const sentence = state.sentences[sentenceIndex];
  const target = state.sentenceTargets[sentenceIndex];
  const minDmg = Math.round(target * 0.6);

  if (isBossRound()) {
    $("round-info").textContent = t("game.bossReview", {
      current: state.bossPhase + 1,
      total: state.sentences.length,
    });
    $("damage-info").textContent = t("game.damageReview", {
      sentence: displaySentence(sentence),
      min: minDmg,
      max: target,
    });
  } else {
    $("round-info").textContent = t("game.roundNormal", {
      round: state.round + 1,
      total: state.sentences.length + 1,
    });
    $("damage-info").textContent = t("game.damageNormal", {
      min: minDmg,
      max: target,
    });
  }
}

function beginSentence(sentenceIndex) {
  state.sentenceIndex = sentenceIndex;
  const sentence = state.sentences[sentenceIndex];
  state.correctWords = parseSentenceToCards(sentence);
  state.currentIndex = 0;
  state.built = "";
  state.gauge = 0;

  updateRoundInfo(sentenceIndex);

  $("built").textContent = "";
  setMessageI18n("game.clickCards");
  updateGauge();
  updateInventoryUI();
  spawnCards(state.correctWords);
}

function startRound() {
  if (isBossRound()) {
    if (!state.bossInitialized) {
      state.bossInitialized = true;
      setupBoss();
      playBgm("boss");
      updateInventoryUI();
      setMessageI18n(
        "messages.bossAppears",
        { count: state.inventory.length },
        "success"
      );
    }
    beginSentence(state.bossPhase);
    return;
  }

  playBgm("regular");
  setupMonster(state.round);
  beginSentence(state.round);
}

function retrySentence() {
  beginSentence(isBossRound() ? state.bossPhase : state.round);
}

function onCardClick(card, word) {
  if (card.disabled) return;
  playSfx("pick_card");

  if (word === state.correctWords[state.currentIndex]) {
    card.classList.add("correct");
    card.disabled = true;
    setTimeout(() => card.remove(), 280);

    state.built += (state.built ? " " : "") + word;
    $("built").textContent = state.built;
    state.currentIndex++;
    state.gauge = Math.min(
      100,
      Math.round((state.currentIndex / state.correctWords.length) * 100)
    );
    updateGauge();
    setMessageI18n("messages.correct", {}, "success");

    if (state.currentIndex >= state.correctWords.length) {
      setTimeout(attackEnemy, 400);
    }
  } else {
    card.classList.add("wrong");
    state.gauge = Math.max(0, state.gauge - 15);
    updateGauge();
    enemyCounterAttack();
    setTimeout(() => card.classList.remove("wrong"), 400);
  }
}

function attackEnemy() {
  const { base, bonus, total: damage, target } = calcDamage(state.gauge, state.sentenceIndex);

  state.enemyHp = Math.max(0, state.enemyHp - damage);
  updateHpBars();

  const sprite = $("enemy-sprite");
  sprite.classList.add("hit");
  setTimeout(() => sprite.classList.remove("hit"), 400);

  if (isBossRound()) playSfx("player_attack");

  setMessageI18n(
    "messages.attack",
    { damage, base, bonus, target },
    "success"
  );

  if (isBossRound()) {
    handleBossAfterAttack();
  } else {
    handleNormalAfterAttack();
  }
}

function handleNormalAfterAttack() {
  if (state.enemyHp <= 0) {
    playSfx("player_attack");
    const item = grantRoundItem();
    setMessageI18n(
      "messages.roundClear",
      { round: state.round + 1, icon: item.icon, name: item.name },
      "success"
    );
    state.round++;
    setTimeout(() => {
      startRound();
    }, 1400);
    return;
  }

  setTimeout(() => {
    setMessageI18n("messages.monsterHpLeft", { hp: state.enemyHp }, "fail");
    retrySentence();
  }, 1000);
}

function handleBossAfterAttack() {
  if (state.enemyHp <= 0) {
    setTimeout(finishVictory, 600);
    return;
  }

  state.bossPhase++;

  if (state.bossPhase >= state.sentences.length) {
    setTimeout(finishVictory, 600);
    return;
  }

  setTimeout(() => {
    setMessageI18n("messages.bossHpLeft", { hp: state.enemyHp }, "success");
    beginSentence(state.bossPhase);
  }, 1200);
}

function finishVictory() {
  stopBgm();
  playSfx("victory");

  state.enemyHp = 0;
  updateHpBars();

  const sprite = $("enemy-sprite");
  sprite.classList.add("defeated");
  sprite.textContent = "💀";
  setMessageI18n("messages.bossDefeated", {}, "success");

  setTimeout(() => endGame(true), 1200);
}

function enemyCounterAttack() {
  if (state.shieldActive) {
    state.shieldActive = false;
    setMessageI18n("messages.shieldBlocked", {}, "success");
    return;
  }

  const dmg = 5;
  state.playerHp -= dmg;
  updateHpBars();
  playSfx("player_damage");
  setMessageI18n("messages.wrongOrder", { dmg }, "fail");

  const sprite = $("enemy-sprite");
  sprite.classList.add("attack-player");
  setTimeout(() => sprite.classList.remove("attack-player"), 400);

  if (state.playerHp <= 0) {
    setTimeout(() => endGame(false), 600);
  }
}

function endGame(victory) {
  stopBgm();
  if (!victory) playSfx("boss_fail");

  uiState.lastVictory = victory;
  showScreen("result");
  if (victory) {
    $("result-icon").textContent = "🎉";
    $("result-title").textContent = t("result.victoryTitle");
    $("result-desc").textContent = t("result.victoryDesc");
  } else {
    $("result-icon").textContent = "💀";
    $("result-title").textContent = t("result.defeatTitle");
    $("result-desc").textContent = t("result.defeatDesc");
  }
}

function refreshGameUI() {
  if (!$("game-screen").classList.contains("active")) return;

  if (isBossRound() && state.bossInitialized) {
    $("monster-name").textContent = t("game.bossRound", { name: getBossName() });
    $("enemy-hp-label").textContent = t("labels.bossHp");
  } else if (state.round < state.sentences.length && $("game-screen").classList.contains("active")) {
    const name = getMonsterName(state.round);
    $("monster-name").textContent = t("game.roundMonster", { round: state.round + 1, name });
    $("enemy-hp-label").textContent = t("labels.monsterHp");
  }

  const sentenceIndex = isBossRound() ? state.bossPhase : state.round;
  if (
    state.sentences.length > 0 &&
    sentenceIndex < state.sentences.length &&
    (state.round < state.sentences.length || state.bossInitialized)
  ) {
    updateRoundInfo(sentenceIndex);
  }

  updateInventoryUI();

  if (uiState.lastMessage) {
    const { key, params, type } = uiState.lastMessage;
    setMessage(t(key, params), type);
  }
}

function refreshResultUI() {
  if (!$("result-screen").classList.contains("active")) return;
  if (uiState.lastVictory === null) return;

  if (uiState.lastVictory) {
    $("result-title").textContent = t("result.victoryTitle");
    $("result-desc").textContent = t("result.victoryDesc");
  } else {
    $("result-title").textContent = t("result.defeatTitle");
    $("result-desc").textContent = t("result.defeatDesc");
  }
}

function applyHtmlI18n() {
  const el = $("hint-brackets");
  if (el) el.innerHTML = t("setup.hintLine2Html");
}

window.refreshI18n = function refreshI18n() {
  applyHtmlI18n();
  renderSentenceList();
  refreshGameUI();
  refreshResultUI();
};

function startGame() {
  unlockAudio();
  const bossHp = parseInt($("enemy-hp").value, 10) || 50;
  state.playerMaxHp = parseInt($("player-hp").value, 10) || 30;
  state.sentenceTargets = computeSentenceTargets(bossHp, state.sentences.length);
  state.playerHp = state.playerMaxHp;
  state.round = 0;
  state.bossPhase = 0;
  state.inventory = [];
  state.shieldActive = false;
  state.bossInitialized = false;
  uiState.lastMessage = null;
  uiState.lastVictory = null;

  $("enemy-panel").classList.remove("boss-panel");
  updateInventoryUI();
  showScreen("game");
  startRound();
}

$("add-btn").addEventListener("click", () => {
  const text = $("sentence-input").value.trim();
  if (!text) return;
  state.sentences.push(text);
  $("sentence-input").value = "";
  renderSentenceList();
});

$("sentence-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("add-btn").click();
});

$("sentence-list").addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    state.sentences.splice(parseInt(e.target.dataset.i, 10), 1);
    renderSentenceList();
  }
});

$("enemy-hp").addEventListener("input", updateDamagePreview);
$("start-btn").addEventListener("click", startGame);
$("retry-btn").addEventListener("click", retrySentence);
$("back-btn").addEventListener("click", () => {
  stopBgm();
  showScreen("setup");
});
$("back-btn-2").addEventListener("click", () => {
  stopBgm();
  showScreen("setup");
});
$("again-btn").addEventListener("click", startGame);

function initSentenceBattle() {
  applyHtmlI18n();
  renderSentenceList();
}

if (window.__sbI18nReady) {
  initSentenceBattle();
} else {
  window.addEventListener("sentence-battle:i18nready", initSentenceBattle, { once: true });
}

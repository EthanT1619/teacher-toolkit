import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.esT = (k, p) => t('tool.edu-scoreboard.' + k, p);

const RESOURCES = [
  { key: 'candy', name: 'Candy' },
  { key: 'shield', name: 'Shield' },
  { key: 'stamp', name: 'Stamp' },
];

const DEFAULT_TEAM_1 = 'Team 1';
const DEFAULT_TEAM_2 = 'Team 2';

const state = {
  team1Name: DEFAULT_TEAM_1,
  team2Name: DEFAULT_TEAM_2,
  bombCount: 1,
  teams: [
    { score: 0, candy: 0, stamp: 0, shield: 0, bombHits: 0 },
    { score: 0, candy: 0, stamp: 0, shield: 0, bombHits: 0 },
  ],
};

const $ = (sel) => document.querySelector(sel);

let els = {};

function updatePageTitle() {
  document.title = esT('title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? esT('actions.switchToKo')
      : esT('actions.switchToEn');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  updateHeaders();
  if ($('#scoreboard').style.display === 'flex') {
    renderScoreboard();
  }
}

function showScreen(screen) {
  $('#settings').style.display = screen === 'settings' ? 'flex' : 'none';
  $('#scoreboard').style.display = screen === 'scoreboard' ? 'flex' : 'none';
}

function bombLabel(name) {
  if (state.bombCount <= 1) {
    return esT('bomb.resetsScore', { name });
  }
  return esT('bomb.withHits', { name, count: state.bombCount });
}

function updateHeaders() {
  $('#headerTeamA').textContent = state.team1Name;
  $('#headerTeamB').textContent = state.team2Name;
  $('#btnBomb1').textContent = bombLabel(state.team1Name);
  $('#btnBomb2').textContent = bombLabel(state.team2Name);
}

function bombTrackHtml(hits) {
  if (hits <= 0) return '';
  return Array.from({ length: hits }, () => '<span class="bomb-badge">💣</span>').join('');
}

function updateBombDisplay(teamIdx) {
  const container = teamIdx === 0 ? $('#teamA') : $('#teamB');
  const track = container.querySelector('.bomb-track');
  if (!track) return;
  track.innerHTML = bombTrackHtml(state.teams[teamIdx].bombHits);
}

function bombTeam(teamIdx) {
  const team = state.teams[teamIdx];
  const limit = state.bombCount;

  if (limit <= 1) {
    team.score = 0;
    team.bombHits = 0;
    updateDisplay(teamIdx, 'score');
    updateBombDisplay(teamIdx);
    closeMenu();
    return;
  }

  team.bombHits += 1;
  if (team.bombHits >= limit) {
    team.score = 0;
    team.bombHits = 0;
    updateDisplay(teamIdx, 'score');
  }
  updateBombDisplay(teamIdx);
  closeMenu();
}

function openMenu() {
  const btn = $('#btnMenu');
  const popup = $('#menuPopup');
  const rect = btn.getBoundingClientRect();
  popup.style.top = `${rect.bottom + 6}px`;
  popup.classList.add('show');
  $('#menuBackdrop').classList.add('show');
  btn.classList.add('open');
}

function closeMenu() {
  $('#menuPopup').classList.remove('show');
  $('#menuBackdrop').classList.remove('show');
  $('#btnMenu').classList.remove('open');
}

function switchPoints() {
  const tmp = state.teams[0].score;
  state.teams[0].score = state.teams[1].score;
  state.teams[1].score = tmp;
  updateDisplay(0, 'score');
  updateDisplay(1, 'score');
  closeMenu();
}

function switchEverything() {
  [state.teams[0], state.teams[1]] = [state.teams[1], state.teams[0]];
  renderScoreboard();
  closeMenu();
}

function buildTeamPanel(container, teamIdx) {
  const data = state.teams[teamIdx];

  container.innerHTML = `
        <div class="score-area">
          <div class="score-controls" data-team="${teamIdx}" data-key="score">
            <div class="score-side score-side-minus">
              <button class="btn-circle btn-minus btn-score" data-delta="-1">−</button>
              <div class="score-helpers">
                <button type="button" class="btn-helper btn-helper-minus" data-delta="-5">−5</button>
                <button type="button" class="btn-helper btn-helper-minus" data-delta="-10">−10</button>
              </div>
            </div>
            <div class="score-center">
              <span class="score-display">${data.score}</span>
              <div class="bomb-track">${bombTrackHtml(data.bombHits)}</div>
            </div>
            <div class="score-side score-side-plus">
              <button class="btn-circle btn-plus btn-score" data-delta="1">+</button>
              <div class="score-helpers">
                <button type="button" class="btn-helper btn-helper-plus" data-delta="5">+5</button>
                <button type="button" class="btn-helper btn-helper-plus" data-delta="10">+10</button>
              </div>
            </div>
          </div>
        </div>
        <div class="resources">
          ${RESOURCES.map((res) => `
              <div class="resource-box" data-team="${teamIdx}" data-key="${res.key}">
                <span class="resource-label" aria-label="${res.name}">
                  <span class="resource-name">${res.name}</span>
                </span>
                <span class="resource-value">${data[res.key]}</span>
                <div class="resource-btns">
                  <button class="btn-circle btn-minus btn-resource" data-delta="-1">−</button>
                  <button class="btn-circle btn-plus btn-resource" data-delta="1">+</button>
                </div>
              </div>`).join('')}
        </div>`;

  container.querySelectorAll('[data-team][data-key]').forEach((row) => {
    row.querySelectorAll('button[data-delta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const team = Number(row.dataset.team);
        const key = row.dataset.key;
        const delta = Number(btn.dataset.delta);
        const next = state.teams[team][key] + delta;
        state.teams[team][key] = key === 'score' ? next : Math.max(0, next);
        updateDisplay(team, key);
      });
    });
  });
}

function updateDisplay(teamIdx, key) {
  const container = teamIdx === 0 ? $('#teamA') : $('#teamB');
  const val = state.teams[teamIdx][key];
  const row = container.querySelector(`[data-key="${key}"]`);
  if (!row) return;
  const display = row.querySelector(key === 'score' ? '.score-display' : '.resource-value');
  if (display) display.textContent = val;
}

function renderScoreboard() {
  updateHeaders();
  buildTeamPanel($('#teamA'), 0);
  buildTeamPanel($('#teamB'), 1);
}

function resetScores() {
  state.teams.forEach((t) => {
    t.score = 0;
    t.candy = 0;
    t.stamp = 0;
    t.shield = 0;
    t.bombHits = 0;
  });
  renderScoreboard();
}

function cacheElements() {
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  $('#settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.team1Name = $('#team1Name').value.trim() || DEFAULT_TEAM_1;
    state.team2Name = $('#team2Name').value.trim() || DEFAULT_TEAM_2;
    state.bombCount = Math.max(1, Math.min(5, parseInt($('#bombCount').value, 10) || 1));
    $('#bombCount').value = state.bombCount;
    renderScoreboard();
    showScreen('scoreboard');
  });

  $('#btnBack').addEventListener('click', () => {
    closeMenu();
    $('#team1Name').value = state.team1Name;
    $('#team2Name').value = state.team2Name;
    $('#bombCount').value = state.bombCount;
    showScreen('settings');
  });

  $('#btnReset').addEventListener('click', () => {
    if (confirm(esT('confirm.resetScores'))) resetScores();
  });

  $('#btnMenu').addEventListener('click', (e) => {
    e.stopPropagation();
    if ($('#menuPopup').classList.contains('show')) closeMenu();
    else openMenu();
  });

  $('#menuBackdrop').addEventListener('click', closeMenu);
  $('#menuPopup').addEventListener('click', (e) => e.stopPropagation());

  $('#btnBomb1').addEventListener('click', (e) => {
    e.stopPropagation();
    bombTeam(0);
  });

  $('#btnBomb2').addEventListener('click', (e) => {
    e.stopPropagation();
    bombTeam(1);
  });

  $('#btnSwitchPoint').addEventListener('click', (e) => {
    e.stopPropagation();
    switchPoints();
  });

  $('#btnSwitchAll').addEventListener('click', (e) => {
    e.stopPropagation();
    switchEverything();
  });

  els.btnLanguage.addEventListener('click', async () => {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  updatePageTitle();
  updateLanguageButton();
  bindEvents();
}

boot();

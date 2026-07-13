/** 사용자용 업데이트 안내 (도움말 센터 · NEW 뱃지 공용) */
window.TOOLKIT_HELP_UPDATES = [
  {
    date: "2026-07-13",
    title: "학습·활동 Tool 3종 추가",
    items: [
      "학습툴 Phonics Hunt(화면 제목: 단어 별 찾기) — 단어 칸을 열며 별 점수를 모으는 두 팀 게임",
      "활동 Castle Siege — 성 HP를 공격·수리하며 라운드별로 대결하는 전투형 게임",
      "활동 Treasure Hunt — 땅속 칸을 파며 보물 점수를 모으는 두 팀 게임",
    ],
  },
  {
    date: "2026-07-04",
    title: "Tool 간 UI 일치정도 개선",
    items: [
      "각 Tool 화면 상단에 통일된 홈 링크(← Tool Kit)를 적용했습니다.",
      "도움말 센터를 추가해 사용 가이드·업데이트·FAQ를 확인할 수 있습니다.",
    ],
  },
  {
    date: "2026-07-03",
    title: "보강 스케줄러 추가",
    items: [
      "보강 일정을 달력에서 관리할 수 있습니다.",
      "학생별 보강 횟수를 확인할 수 있습니다.",
      "결석일 진도와 특이사항을 메모할 수 있습니다.",
    ],
  },
  {
    date: "2026-07-02",
    title: "반별 체크리스트 추가",
    items: [
      "반마다 준비물을 따로 체크할 수 있습니다.",
      "체크 상태는 자동 저장됩니다.",
    ],
  },
];

window.TOOLKIT_HELP_LAST_SEEN_KEY = "helpLastSeenDate";

window.getLatestHelpUpdateDate = function getLatestHelpUpdateDate() {
  const list = window.TOOLKIT_HELP_UPDATES;
  if (!list || !list.length) return null;
  return list.reduce(function (latest, entry) {
    return entry.date > latest ? entry.date : latest;
  }, list[0].date);
};

window.formatHelpUpdateDate = function formatHelpUpdateDate(isoDate) {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return parts[0] + "." + parts[1] + "." + parts[2];
};

window.hasUnreadHelpUpdates = function hasUnreadHelpUpdates() {
  const latest = window.getLatestHelpUpdateDate();
  if (!latest) return false;
  const seen = localStorage.getItem(window.TOOLKIT_HELP_LAST_SEEN_KEY);
  if (!seen) return true;
  return latest > seen;
};

window.markHelpUpdatesSeen = function markHelpUpdatesSeen() {
  const latest = window.getLatestHelpUpdateDate();
  if (latest) {
    localStorage.setItem(window.TOOLKIT_HELP_LAST_SEEN_KEY, latest);
  }
};

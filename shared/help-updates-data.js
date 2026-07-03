/** 사용자용 업데이트 안내 (도움말 센터 · NEW 뱃지 공용) */
window.TOOLKIT_HELP_UPDATES = [
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

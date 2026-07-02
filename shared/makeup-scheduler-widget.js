(function initMakeupSchedulerWidget() {
  const STORAGE_KEY = "makeup-scheduler-schedules";
  const APP_HREF = "./makeup-scheduler/";

  const STATUS_LABELS = {
    scheduled: "예정",
    completed: "완료",
    cancelled: "취소",
  };

  const els = {
    date: document.getElementById("makeupWidgetDate"),
    count: document.getElementById("makeupWidgetCount"),
    overlap: document.getElementById("makeupWidgetOverlap"),
    list: document.getElementById("makeupWidgetList"),
  };

  if (!els.list) return;

  function loadSchedulesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data.map(normalizeSchedule) : [];
    } catch {
      return [];
    }
  }

  function normalizeSchedule(schedule) {
    const startTime = schedule.startTime || schedule.time || "";
    let endTime = schedule.endTime || "";
    if (startTime && !endTime && schedule.time && !schedule.startTime) {
      endTime = addMinutes(startTime, 60);
    }
    return { ...schedule, startTime, endTime };
  }

  function addMinutes(timeStr, minutes) {
    const parts = timeStr.split(":").map(Number);
    const h = parts[0];
    const m = parts[1];
    const total = h * 60 + m + minutes;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return String(nh).padStart(2, "0") + ":" + String(nm).padStart(2, "0");
  }

  function formatTodayDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function formatDateKorean(dateStr) {
    const parts = dateStr.split("-").map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const date = new Date(y, m - 1, d);
    return y + "년 " + m + "월 " + d + "일 (" + dayNames[date.getDay()] + ")";
  }

  function getStartTime(schedule) {
    return schedule.startTime || schedule.time || "";
  }

  function getEndTime(schedule) {
    return schedule.endTime || "";
  }

  function formatTimeRange(schedule) {
    const start = getStartTime(schedule);
    const end = getEndTime(schedule);
    if (start && end) return start + " ~ " + end;
    return start || "-";
  }

  function compareByTime(a, b) {
    const startCmp = getStartTime(a).localeCompare(getStartTime(b));
    if (startCmp !== 0) return startCmp;
    return getEndTime(a).localeCompare(getEndTime(b));
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getTodaySchedules() {
    const todayStr = formatTodayDateString();
    return loadSchedulesFromStorage()
      .filter(function (schedule) { return schedule.date === todayStr; })
      .sort(compareByTime);
  }

  function countScheduled(schedules) {
    return schedules.filter(function (schedule) { return schedule.status === "scheduled"; }).length;
  }

  function detectOverlap(schedules) {
    const active = schedules.filter(function (schedule) { return schedule.status !== "cancelled"; });
    if (active.length < 2) return 0;

    const sorted = active.slice().sort(compareByTime);
    let maxLanes = 1;

    for (let i = 0; i < sorted.length; i += 1) {
      let lanes = 1;
      const aStart = getStartTime(sorted[i]);
      const aEnd = getEndTime(sorted[i]) || addMinutes(aStart, 50);

      for (let j = 0; j < sorted.length; j += 1) {
        if (i === j) continue;
        const bStart = getStartTime(sorted[j]);
        const bEnd = getEndTime(sorted[j]) || addMinutes(bStart, 50);
        if (aStart < bEnd && bStart < aEnd) lanes += 1;
      }
      if (lanes > maxLanes) maxLanes = lanes;
    }

    return maxLanes > 1 ? maxLanes : 0;
  }

  function renderMakeupWidget() {
    const todayStr = formatTodayDateString();
    const schedules = getTodaySchedules();
    const scheduledCount = countScheduled(schedules);
    const overlapLanes = detectOverlap(schedules);

    if (els.date) els.date.textContent = formatDateKorean(todayStr);

    if (els.count) {
      if (schedules.length === 0) {
        els.count.textContent = "0건";
      } else if (scheduledCount === schedules.length) {
        els.count.textContent = "예정 " + scheduledCount + "건";
      } else {
        els.count.textContent = "예정 " + scheduledCount + "건 · 전체 " + schedules.length + "건";
      }
    }

    if (els.overlap) {
      if (overlapLanes > 1) {
        els.overlap.textContent = "같은 시간대 보강 " + overlapLanes + "건 — 일정 겹침 확인";
        els.overlap.classList.remove("makeup-widget__overlap--hidden");
      } else {
        els.overlap.textContent = "";
        els.overlap.classList.add("makeup-widget__overlap--hidden");
      }
    }

    if (schedules.length === 0) {
      els.list.innerHTML =
        '<li class="makeup-widget__empty">' +
          "오늘 보강 일정이 없습니다." +
          ' <a href="' + APP_HREF + '">보강 추가하기</a>' +
        "</li>";
      return;
    }

    els.list.innerHTML = schedules.map(function (schedule) {
      const status = schedule.status || "scheduled";
      const statusLabel = STATUS_LABELS[status] || status;
      return (
        '<li class="makeup-widget__item makeup-widget__item--' + escapeHtml(status) + '">' +
          '<a class="makeup-widget__item-link" href="' + APP_HREF + '">' +
            '<div class="makeup-widget__row">' +
              '<span class="makeup-widget__time">' + escapeHtml(formatTimeRange(schedule)) + "</span>" +
              '<span class="makeup-widget__status">' + escapeHtml(statusLabel) + "</span>" +
            "</div>" +
            '<span class="makeup-widget__name">' + escapeHtml(schedule.studentName || "-") + "</span>" +
            '<span class="makeup-widget__class">' + escapeHtml(schedule.className || "-") + "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("");
  }

  function bindMakeupWidgetEvents() {
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) renderMakeupWidget();
    });

    window.addEventListener("focus", renderMakeupWidget);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) renderMakeupWidget();
    });
  }

  bindMakeupWidgetEvents();
  renderMakeupWidget();
})();

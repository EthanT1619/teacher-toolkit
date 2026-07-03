(function initMakeupSchedulerWidget() {
  const STORAGE_KEY = "makeup-scheduler-schedules";
  const APP_HREF = "./makeup-scheduler/";
  const AUTO_INTERVAL_MS = 2000;

  const STATUS_LABELS = {
    scheduled: "예정",
    completed: "완료",
    cancelled: "취소",
  };

  const els = {
    date: document.getElementById("makeupWidgetDate"),
    count: document.getElementById("makeupWidgetCount"),
    overlap: document.getElementById("makeupWidgetOverlap"),
    slide: document.getElementById("makeupWidgetSlide"),
    index: document.getElementById("makeupWidgetIndex"),
    prev: document.getElementById("makeupWidgetPrev"),
    next: document.getElementById("makeupWidgetNext"),
  };

  if (!els.slide) return;

  let todaySchedules = [];
  let currentIndex = 0;
  let autoTimer = null;

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
    const total = parts[0] * 60 + parts[1] + minutes;
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
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return parts[0] + "년 " + parts[1] + "월 " + parts[2] + "일 (" + dayNames[date.getDay()] + ")";
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

  function detectOverlap(schedules) {
    const active = schedules.filter(function (schedule) { return schedule.status !== "cancelled"; });
    if (active.length < 2) return 0;

    let maxLanes = 1;
    for (let i = 0; i < active.length; i += 1) {
      let lanes = 1;
      const aStart = getStartTime(active[i]);
      const aEnd = getEndTime(active[i]) || addMinutes(aStart, 50);

      for (let j = 0; j < active.length; j += 1) {
        if (i === j) continue;
        const bStart = getStartTime(active[j]);
        const bEnd = getEndTime(active[j]) || addMinutes(bStart, 50);
        if (aStart < bEnd && bStart < aEnd) lanes += 1;
      }
      if (lanes > maxLanes) maxLanes = lanes;
    }

    return maxLanes > 1 ? maxLanes : 0;
  }

  function stopAutoRotate() {
    if (autoTimer !== null) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function startAutoRotate() {
    stopAutoRotate();
    if (todaySchedules.length <= 1) return;
    autoTimer = setInterval(function () {
      goToNextSchedule(true);
    }, AUTO_INTERVAL_MS);
  }

  function clampCurrentIndex() {
    if (todaySchedules.length === 0) {
      currentIndex = 0;
      return;
    }
    if (currentIndex >= todaySchedules.length) {
      currentIndex = 0;
    }
    if (currentIndex < 0) {
      currentIndex = todaySchedules.length - 1;
    }
  }

  function renderScheduleCard(schedule) {
    const status = schedule.status || "scheduled";
    const statusLabel = STATUS_LABELS[status] || status;
    return (
      '<a class="makeup-widget__card makeup-widget__card--' + escapeHtml(status) + '" href="' + APP_HREF + '">' +
        '<div class="makeup-widget__card-row">' +
          '<span class="makeup-widget__time">' + escapeHtml(formatTimeRange(schedule)) + "</span>" +
          '<span class="makeup-widget__status">' + escapeHtml(statusLabel) + "</span>" +
        "</div>" +
        '<span class="makeup-widget__name">' + escapeHtml(schedule.studentName || "-") + "</span>" +
        '<span class="makeup-widget__class">' + escapeHtml(schedule.className || "-") + "</span>" +
      "</a>"
    );
  }

  function renderCarouselView() {
    const total = todaySchedules.length;
    const hasItems = total > 0;

    if (els.prev) els.prev.disabled = !hasItems || total <= 1;
    if (els.next) els.next.disabled = !hasItems || total <= 1;

    if (els.index) {
      els.index.textContent = hasItems ? (currentIndex + 1) + " / " + total : "";
    }

    if (!hasItems) {
      els.slide.innerHTML = '<p class="makeup-widget__empty">오늘 예정된 보강이 없습니다.</p>';
      return;
    }

    els.slide.innerHTML = renderScheduleCard(todaySchedules[currentIndex]);
  }

  function goToPrevSchedule(manual) {
    if (todaySchedules.length === 0) return;
    if (manual) stopAutoRotate();
    currentIndex = (currentIndex - 1 + todaySchedules.length) % todaySchedules.length;
    renderCarouselView();
    if (manual) startAutoRotate();
  }

  function goToNextSchedule(fromAuto) {
    if (todaySchedules.length === 0) return;
    if (!fromAuto) stopAutoRotate();
    currentIndex = (currentIndex + 1) % todaySchedules.length;
    renderCarouselView();
    if (!fromAuto) startAutoRotate();
  }

  function renderMakeupWidget() {
    const todayStr = formatTodayDateString();
    todaySchedules = getTodaySchedules();
    clampCurrentIndex();

    if (els.date) els.date.textContent = formatDateKorean(todayStr);
    if (els.count) els.count.textContent = "총 " + todaySchedules.length + "건";

    const overlapLanes = detectOverlap(todaySchedules);
    if (els.overlap) {
      if (overlapLanes > 1) {
        els.overlap.textContent = "같은 시간대 보강 " + overlapLanes + "건 — 일정 겹침 확인";
        els.overlap.classList.remove("makeup-widget__overlap--hidden");
      } else {
        els.overlap.textContent = "";
        els.overlap.classList.add("makeup-widget__overlap--hidden");
      }
    }

    renderCarouselView();
    startAutoRotate();
  }

  function bindMakeupWidgetEvents() {
    if (els.prev) {
      els.prev.addEventListener("click", function () {
        goToPrevSchedule(true);
      });
    }

    if (els.next) {
      els.next.addEventListener("click", function () {
        goToNextSchedule(false);
      });
    }

    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) renderMakeupWidget();
    });

    window.addEventListener("focus", renderMakeupWidget);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAutoRotate();
      } else {
        renderMakeupWidget();
      }
    });
  }

  bindMakeupWidgetEvents();
  renderMakeupWidget();
})();

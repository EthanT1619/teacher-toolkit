(function initMakeupSchedulerWidget() {
  const LOCAL_STORAGE_KEY = "makeup-scheduler-schedules";
  const SYNC_APP_URL = new URL("../mkup-scheduler-synced/", window.location.href).href;
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
    openBtn: document.querySelector(".makeup-widget__open-btn"),
  };

  if (!els.slide) return;

  let todaySchedules = [];
  let currentIndex = 0;
  let autoTimer = null;
  let supabaseClient = null;
  let dataSource = "none";
  let refreshPromise = null;

  if (els.openBtn) {
    els.openBtn.href = SYNC_APP_URL;
  }

  function isSupabaseConfigured() {
    return (
      typeof SUPABASE_CONFIG !== "undefined" &&
      SUPABASE_CONFIG.url &&
      SUPABASE_CONFIG.publishableKey &&
      typeof supabase !== "undefined" &&
      supabase.createClient
    );
  }

  function getSupabaseClient() {
    if (!isSupabaseConfigured()) return null;
    if (!supabaseClient) {
      supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
    }
    return supabaseClient;
  }

  function formatDbTime(value) {
    if (!value) return "";
    const str = String(value);
    return str.length >= 5 ? str.slice(0, 5) : str;
  }

  function scheduleFromDbRow(row) {
    return normalizeSchedule({
      id: row.id,
      studentName: row.student_name,
      className: row.class_name || "",
      date: row.date,
      startTime: formatDbTime(row.start_time),
      endTime: formatDbTime(row.end_time),
      status: row.status,
    });
  }

  function loadSchedulesFromStorage() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
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

  function filterTodaySchedules(schedules) {
    const todayStr = formatTodayDateString();
    return schedules
      .filter(function (schedule) { return schedule.date === todayStr; })
      .sort(compareByTime);
  }

  async function fetchTodaySchedulesFromSupabase(client) {
    const todayStr = formatTodayDateString();
    const { data, error } = await client
      .from("makeup_schedules")
      .select("id, student_name, class_name, date, start_time, end_time, status")
      .eq("date", todayStr)
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(error.message || "일정을 불러오지 못했습니다.");
    }

    return (data || []).map(scheduleFromDbRow);
  }

  async function loadTodaySchedules() {
    const client = getSupabaseClient();
    if (!client) {
      dataSource = "local";
      return filterTodaySchedules(loadSchedulesFromStorage());
    }

    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        console.warn("보강 위젯: 세션 확인 실패", sessionError);
      }

      const session = sessionData?.session;
      if (session) {
        dataSource = "supabase";
        return await fetchTodaySchedulesFromSupabase(client);
      }
    } catch (err) {
      console.warn("보강 위젯: Supabase 조회 실패", err);
    }

    dataSource = "local";
    return filterTodaySchedules(loadSchedulesFromStorage());
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

  function renderEmptyState() {
    if (dataSource === "supabase") {
      return '<p class="makeup-widget__empty">오늘 예정된 보강이 없습니다.</p>';
    }

    if (isSupabaseConfigured()) {
      return (
        '<p class="makeup-widget__empty">' +
          "보강 일정을 보려면 Google 로그인이 필요합니다.<br>" +
          '<a href="' + escapeHtml(SYNC_APP_URL) + '">보강 캘린더에서 로그인</a>' +
        "</p>"
      );
    }

    return '<p class="makeup-widget__empty">오늘 예정된 보강이 없습니다.</p>';
  }

  function renderScheduleCard(schedule) {
    const status = schedule.status || "scheduled";
    const statusLabel = STATUS_LABELS[status] || status;
    return (
      '<a class="makeup-widget__card makeup-widget__card--' + escapeHtml(status) + '" href="' + escapeHtml(SYNC_APP_URL) + '">' +
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
      els.slide.innerHTML = renderEmptyState();
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

  function showLoadingState() {
    stopAutoRotate();
    if (els.slide) {
      els.slide.innerHTML = '<p class="makeup-widget__empty">보강 일정을 불러오는 중…</p>';
    }
    if (els.prev) els.prev.disabled = true;
    if (els.next) els.next.disabled = true;
    if (els.index) els.index.textContent = "";
  }

  function refreshMakeupWidget() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async function () {
      showLoadingState();
      try {
        todaySchedules = await loadTodaySchedules();
      } catch (err) {
        console.warn("보강 위젯: 새로고침 실패", err);
        dataSource = "local";
        todaySchedules = filterTodaySchedules(loadSchedulesFromStorage());
      }
      renderMakeupWidget();
    })().finally(function () {
      refreshPromise = null;
    });

    return refreshPromise;
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
      if (event.key === LOCAL_STORAGE_KEY) {
        refreshMakeupWidget();
      }
    });

    window.addEventListener("focus", function () {
      refreshMakeupWidget();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAutoRotate();
      } else {
        refreshMakeupWidget();
      }
    });

    const client = getSupabaseClient();
    if (client) {
      client.auth.onAuthStateChange(function () {
        refreshMakeupWidget();
      });
    }
  }

  bindMakeupWidgetEvents();
  refreshMakeupWidget();
})();

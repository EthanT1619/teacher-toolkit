/**
 * 보강 데이터 CRUD 및 조회
 */
class ScheduleManager {
  constructor(storageManager) {
    this.storage = storageManager;
    const raw = this.storage.load();
    this.schedules = raw.map((s) => this.normalize(s));
    if (raw.some((s) => s.time && !s.startTime)) {
      this.persist();
    }
  }

  /** 기존 time 필드 → startTime/endTime 변환 */
  normalize(schedule) {
    const startTime = schedule.startTime || schedule.time || '';
    let endTime = schedule.endTime || '';

    if (startTime && !endTime && schedule.time && !schedule.startTime) {
      endTime = ScheduleManager.addMinutes(startTime, 60);
    }

    const { time, ...rest } = schedule;
    return { ...rest, startTime, endTime };
  }

  static getStartTime(schedule) {
    return schedule.startTime || schedule.time || '';
  }

  static getEndTime(schedule) {
    return schedule.endTime || '';
  }

  static formatTimeRange(schedule) {
    const start = ScheduleManager.getStartTime(schedule);
    const end = ScheduleManager.getEndTime(schedule);
    if (start && end) return `${start} ~ ${end}`;
    return start || '-';
  }

  static compareByTime(a, b) {
    const startCmp = ScheduleManager.getStartTime(a).localeCompare(ScheduleManager.getStartTime(b));
    if (startCmp !== 0) return startCmp;
    return ScheduleManager.getEndTime(a).localeCompare(ScheduleManager.getEndTime(b));
  }

  static addMinutes(timeStr, minutes) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  getAll() {
    return [...this.schedules];
  }

  generateId() {
    return `sch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  getByDate(dateStr) {
    return this.schedules
      .filter((s) => s.date === dateStr)
      .sort(ScheduleManager.compareByTime);
  }

  getById(id) {
    return this.schedules.find((s) => s.id === id) || null;
  }

  add(data) {
    const now = new Date().toISOString();
    const schedule = {
      id: this.generateId(),
      studentName: data.studentName.trim(),
      className: data.className.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: (data.reason || '').trim(),
      memo: (data.memo || '').trim(),
      absenceProgress: (data.absenceProgress || '').trim(),
      status: data.status || 'scheduled',
      createdAt: now,
      updatedAt: now,
    };
    this.schedules.push(schedule);
    this.persist();
    return schedule;
  }

  update(id, data) {
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index === -1) return null;

    this.schedules[index] = {
      ...this.schedules[index],
      studentName: data.studentName.trim(),
      className: data.className.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: (data.reason || '').trim(),
      memo: (data.memo || '').trim(),
      absenceProgress: (data.absenceProgress || '').trim(),
      status: data.status,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.schedules[index];
  }

  updateStatus(id, status) {
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index === -1) return null;

    this.schedules[index] = {
      ...this.schedules[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.schedules[index];
  }

  delete(id) {
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.schedules.splice(index, 1);
    this.persist();
    return true;
  }

  getByMonth(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return this.schedules.filter((s) => s.date.startsWith(prefix));
  }

  getClassNames() {
    const names = new Set(this.schedules.map((s) => s.className).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, 'ko'));
  }

  persist() {
    this.storage.save(this.schedules);
  }
}

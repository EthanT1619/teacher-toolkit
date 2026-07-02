/**
 * 앱 진입점 — 모든 매니저 조율
 */
class App {
  constructor() {
    this.storage = new StorageManager();
    this.schedules = new ScheduleManager(this.storage);
    this.filter = new FilterManager();
    this.students = new StudentManager();
    this.calendar = new CalendarManager();
    this.modal = new ModalManager();
    this.renderer = new Renderer({
      calendarManager: this.calendar,
      scheduleManager: this.schedules,
      filterManager: this.filter,
      studentManager: this.students,
      modalManager: this.modal,
    });

    this.timelineDate = CalendarManager.formatDate(new Date());
    this.renderer.setTimelineDate(this.timelineDate);
    this.panelCollapse = new PanelCollapseManager();

    this.bindEvents();
    this.renderer.renderAll();
  }

  /** 달력에서 날짜 선택 — 모달 없이 오른쪽 패널·타임라인만 갱신 */
  selectDate(dateStr) {
    this.setTimelineDate(dateStr);
    this.refresh();
  }

  bindEvents() {
    document.getElementById('btn-prev-month').addEventListener('click', () => {
      this.calendar.prevMonth();
      this.refresh();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
      this.calendar.nextMonth();
      this.refresh();
    });

    document.getElementById('btn-today').addEventListener('click', () => {
      this.calendar.goToToday();
      this.selectDate(CalendarManager.formatDate(new Date()));
    });

    document.getElementById('btn-add-schedule').addEventListener('click', () => {
      this.modal.openFormModal({ date: this.timelineDate });
    });

    document.getElementById('btn-students').addEventListener('click', () => {
      this.modal.openStudentsModal();
      this.renderer.renderStudentList();
    });

    document.getElementById('global-search').addEventListener('input', (e) => {
      this.filter.setSearch(e.target.value);
      this.refresh();
    });

    document.getElementById('class-filter').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-class]');
      if (!btn) return;
      this.filter.setClass(btn.dataset.class);
      this.refresh();
    });

    document.getElementById('calendar').addEventListener('click', (e) => {
      const day = e.target.closest('[data-date]');
      if (!day) return;
      this.selectDate(day.dataset.date);
    });

    document.getElementById('calendar').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const day = e.target.closest('[data-date]');
      if (!day) return;
      e.preventDefault();
      this.selectDate(day.dataset.date);
    });

    document.getElementById('btn-add-selected-day').addEventListener('click', () => {
      this.modal.openFormModal({ date: this.timelineDate });
    });

    document.getElementById('btn-open-day-detail').addEventListener('click', () => {
      this.openDateDetail(this.timelineDate);
    });

    document.getElementById('btn-add-from-date').addEventListener('click', () => {
      const date = this.modal.getSelectedDate();
      this.modal.openFormModal({ date });
    });

    document.getElementById('date-schedule-list').addEventListener('click', (e) => {
      this.handleScheduleAction(e);
    });

    document.getElementById('selected-day-schedules').addEventListener('click', (e) => {
      if (this.handleQuickStatus(e)) return;
      this.handleScheduleItemClick(e);
    });

    document.getElementById('today-schedules').addEventListener('click', (e) => {
      if (this.handleQuickStatus(e)) return;
      this.handleScheduleItemClick(e);
    });

    document.getElementById('week-schedules').addEventListener('click', (e) => {
      if (this.handleQuickStatus(e)) return;
      this.handleScheduleItemClick(e);
    });

    document.getElementById('schedule-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSchedule();
    });

    document.getElementById('form-start-time').addEventListener('change', (e) => {
      const start = e.target.value;
      if (!start) return;
      document.getElementById('form-end-time').value = ScheduleManager.addMinutes(start, 60);
    });

    document.getElementById('student-search').addEventListener('input', (e) => {
      this.renderer.renderStudentList(e.target.value);
    });

    document.getElementById('student-list').addEventListener('click', (e) => {
      const card = e.target.closest('.student-card');
      if (!card) return;
      const { student, class: className } = card.dataset;
      this.modal.openStudentDetail(student, className);
      this.renderer.renderStudentDetail(student, className);
    });

    document.getElementById('btn-add-from-student').addEventListener('click', () => {
      const { studentName, className } = this.modal.getSelectedStudent();
      this.modal.openFormModal({ studentName, className });
    });

    document.getElementById('btn-confirm-delete').addEventListener('click', () => {
      const id = this.modal.getDeleteTargetId();
      if (id) {
        this.schedules.delete(id);
        this.modal.closeAll();
        this.refresh();
      }
    });

    document.getElementById('search-results').addEventListener('click', (e) => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const schedule = this.schedules.getById(card.dataset.id);
      if (schedule) {
        const [y, m] = schedule.date.split('-').map(Number);
        this.calendar.year = y;
        this.calendar.month = m;
        this.selectDate(schedule.date);
      }
    });

    document.getElementById('day-timeline').addEventListener('click', (e) => {
      const block = e.target.closest('[data-timeline-id]');
      if (!block) return;
      const schedule = this.schedules.getById(block.dataset.timelineId);
      if (schedule) this.openScheduleEdit(schedule);
    });
  }

  openDateDetail(dateStr) {
    this.modal.openDateModal(dateStr);
    this.renderer.renderDateModal(dateStr);
  }

  openScheduleEdit(schedule) {
    this.modal.openFormModal({
      id: schedule.id,
      studentName: schedule.studentName,
      className: schedule.className,
      date: schedule.date,
      startTime: schedule.startTime || schedule.time,
      endTime: schedule.endTime || '',
      reason: schedule.reason,
      memo: schedule.memo,
      absenceProgress: schedule.absenceProgress || '',
      status: schedule.status,
    });
  }

  setTimelineDate(dateStr) {
    this.timelineDate = dateStr;
    this.renderer.setTimelineDate(dateStr);
  }

  handleScheduleItemClick(e) {
    const item = e.target.closest('[data-schedule-id]');
    if (!item) return;
    const schedule = this.schedules.getById(item.dataset.scheduleId);
    if (schedule) this.openScheduleEdit(schedule);
  }

  handleScheduleAction(e) {
    if (this.handleQuickStatus(e)) return;

    const editBtn = e.target.closest('[data-edit]');
    const deleteBtn = e.target.closest('[data-delete]');

    if (editBtn) {
      const schedule = this.schedules.getById(editBtn.dataset.edit);
      if (schedule) this.openScheduleEdit(schedule);
    }

    if (deleteBtn) {
      this.modal.openDeleteConfirm(deleteBtn.dataset.delete);
    }
  }

  handleQuickStatus(e) {
    const btn = e.target.closest('[data-quick-status]');
    if (!btn) return false;

    const schedule = this.schedules.getById(btn.dataset.id);
    if (!schedule) return true;

    this.schedules.updateStatus(btn.dataset.id, btn.dataset.quickStatus);
    this.refresh();
    return true;
  }

  saveSchedule() {
    const data = this.modal.getFormData();

    if (!data.studentName.trim() || !data.className.trim() || !data.date || !data.startTime || !data.endTime) {
      alert('학생 이름, 반 이름, 날짜, 시작·종료 시간은 필수입니다.');
      return;
    }

    if (data.endTime <= data.startTime) {
      alert('종료 시간은 시작 시간보다 뒤여야 합니다.');
      return;
    }

    if (this.modal.isEditing()) {
      this.schedules.update(data.id, data);
    } else {
      this.schedules.add(data);
    }

    this.modal.closeAll();
    this.selectDate(data.date);
  }

  refresh() {
    this.renderer.renderAll();

    if (this.modal.activeModal === 'students') {
      const query = document.getElementById('student-search').value;
      this.renderer.renderStudentList(query);
    }

    if (this.modal.activeModal === 'studentDetail') {
      const { studentName, className } = this.modal.getSelectedStudent();
      if (studentName) {
        this.renderer.renderStudentDetail(studentName, className);
      }
    }

    if (this.modal.activeModal === 'date') {
      const date = this.modal.getSelectedDate();
      if (date) this.renderer.renderDateModal(date);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

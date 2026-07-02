/**
 * localStorage 기반 데이터 저장/로드
 */
class StorageManager {
  static STORAGE_KEY = 'makeup-scheduler-schedules';

  /** 저장된 보강 목록 불러오기 */
  load() {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /** 보강 목록 저장 */
  save(schedules) {
    localStorage.setItem(StorageManager.STORAGE_KEY, JSON.stringify(schedules));
  }
}

/** Persistência local do modo demo (localStorage + espelho em sessionStorage). */

export function loadJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
    sessionStorage.setItem(key, raw);
  } catch (error) {
    console.error(`[demo-storage] Falha ao salvar ${key}`, error);
    throw error;
  }
}

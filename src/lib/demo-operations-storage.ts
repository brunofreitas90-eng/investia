import { loadJson, saveJson } from '@/lib/demo-storage';
import type { Operation } from '@/types';

const STORAGE_KEY = 'investia_operations';

export function loadDemoOperations(): Operation[] | null {
  return loadJson<Operation[]>(STORAGE_KEY);
}

export function saveDemoOperations(ops: Operation[]): void {
  saveJson(STORAGE_KEY, ops);
}

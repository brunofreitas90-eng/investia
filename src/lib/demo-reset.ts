const DEMO_KEYS = [
  'investia_portfolio',
  'investia_watchlist',
  'investia_alerts',
  'investia_operations',
  'investia_financial_goal',
  'investia_preferences',
];

export function clearAllDemoLocalData(): void {
  if (typeof window === 'undefined') return;
  DEMO_KEYS.forEach((key) => localStorage.removeItem(key));
}

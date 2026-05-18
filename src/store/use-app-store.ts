import { create } from 'zustand';
import type { PortfolioItem, DashboardStats } from '@/types';

interface AppState {
  portfolio: PortfolioItem[];
  stats: DashboardStats | null;
  sidebarOpen: boolean;
  setPortfolio: (items: PortfolioItem[]) => void;
  setStats: (stats: DashboardStats | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  portfolio: [],
  stats: null,
  sidebarOpen: true,
  setPortfolio: (portfolio) => set({ portfolio }),
  setStats: (stats) => set({ stats }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));

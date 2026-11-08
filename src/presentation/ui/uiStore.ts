import { create } from 'zustand';
export type UIState = { status: 'loading' | 'ready' | 'running' | 'paused' | 'dead' | 'error'; message: string; setStatus: (status: UIState['status'], message?: string) => void };
export const useUIStore = create<UIState>((set) => ({ status: 'loading', message: 'Inicializando núcleo...', setStatus: (status, message = '') => set({ status, message }) }));

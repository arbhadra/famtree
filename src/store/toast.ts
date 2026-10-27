import { create } from 'zustand';

interface ToastState {
  message: string;
  visible: boolean;
  show: (m: string) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: '',
  visible: false,
  show: (message) => {
    set({ message, visible: true });
    clearTimeout(timer);
    timer = setTimeout(() => set({ visible: false }), 2800);
  },
}));

export const toast = (m: string) => useToast.getState().show(m);

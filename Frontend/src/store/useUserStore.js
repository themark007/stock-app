import { create } from "zustand";

const TOKEN_KEY = "token";
const USER_KEY = "user";

const useUserStore = create((set, get) => ({
  user: null,

  setUser: (user) => {
    set({ user });
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearUser: () => {
    set({ user: null });
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  restoreFromStorage: () => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) set({ user: parsed });
    }
  },

  saveTokenToStorage: (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  },

  getTokenFromStorage: () => localStorage.getItem(TOKEN_KEY),
}));

export default useUserStore;

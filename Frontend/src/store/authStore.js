// store/authStore.js
import { create } from "zustand";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("auth_token") || "abcd",
  isLoggedIn: !!localStorage.getItem("auth_token"),

  login: (token) => {
    localStorage.setItem("auth_token", token);
    set({ token, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    set({ token: null, isLoggedIn: false });
  },
}));

export default useAuthStore;
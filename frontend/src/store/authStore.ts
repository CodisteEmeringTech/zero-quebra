import { create } from 'zustand';
import { auth, type AuthUser } from '../lib/api';

type AuthState = {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: auth.getUser(),
  setUser: (user) => set({ user }),
  signOut: () => { auth.clear(); set({ user: null }); },
}));

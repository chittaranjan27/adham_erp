import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storage } from '@/lib/storage';
import { api, ApiError } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/lib/types';
import { useRouter } from 'expo-router';

interface LoginResponse {
  token: string;
  user: User;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const data = await api.post<LoginResponse>('/api/auth/login', credentials);
      return data;
    },
    onSuccess: async (data) => {
      await storage.setItem('adhams_token', data.token);
      setAuth(data.user, data.token);
      router.replace('/(tabs)');
    },
  });
}

export function useCurrentUser() {
  const { setAuth, clearAuth, token } = useAuthStore();

  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await api.get<User>('/api/auth/me');
      const storedToken = await storage.getItem('adhams_token');
      if (storedToken) {
        setAuth(user, storedToken);
      }
      return user;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return api.post('/api/auth/change-password', data);
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    await clearAuth();
    queryClient.clear();
    router.replace('/(auth)/login');
  };
}

export function useCheckAuth() {
  const { loadToken, setAuth, clearAuth, setLoading } = useAuthStore();

  return async () => {
    setLoading(true);
    try {
      const token = await loadToken();
      if (!token) {
        setLoading(false);
        return false;
      }
      const user = await api.get<User>('/api/auth/me');
      setAuth(user, token);
      return true;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await clearAuth();
      }
      setLoading(false);
      return false;
    }
  };
}

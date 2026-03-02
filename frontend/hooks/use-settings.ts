import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  plan: "free" | "pro" | "pro_plus";
  timezone: string;
  date_joined: string;
}

export interface UserSettings {
  detect_self_conflicts: boolean;
  detect_group_conflicts: boolean;
}

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<UserProfile>("/auth/profile/", authHeaders()),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<UserProfile, "display_name" | "avatar_url" | "timezone">>) =>
      apiFetch<UserProfile>("/auth/profile/", {
        method: "PATCH",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });
}

export function useUserSettings() {
  return useQuery({
    queryKey: ["user-settings"],
    queryFn: () =>
      apiFetch<UserSettings>("/auth/settings/", authHeaders()),
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserSettings>) =>
      apiFetch<UserSettings>("/auth/settings/", {
        method: "PATCH",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });
}

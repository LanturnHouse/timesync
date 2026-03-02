import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Group, GroupInvitation, PaginatedResponse } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () =>
      apiFetch<PaginatedResponse<Group>>("/groups/", authHeaders()),
  });
}

export function useGroup(id: string | null) {
  return useQuery({
    queryKey: ["groups", id],
    queryFn: () => apiFetch<Group>(`/groups/${id}/`, authHeaders()),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiFetch<Group>("/groups/", {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, email }: { groupId: string; email: string }) =>
      apiFetch<GroupInvitation>(`/groups/${groupId}/invite/`, {
        method: "POST",
        body: JSON.stringify({ email }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useJoinByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiFetch<Group>("/groups/join/", {
        method: "POST",
        body: JSON.stringify({ invite_code: inviteCode }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<{ detail: string; group_id: string }>(
        "/groups/invitations/accept/",
        {
          method: "POST",
          body: JSON.stringify({ token }),
          ...authHeaders(),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apiFetch(`/groups/${groupId}/leave/`, {
        method: "POST",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      data,
    }: {
      groupId: string;
      userId: string;
      data: { role?: string; share_mode?: string };
    }) =>
      apiFetch(`/groups/${groupId}/members/${userId}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      apiFetch(`/groups/${groupId}/members/${userId}/`, {
        method: "DELETE",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apiFetch<{ invite_code: string }>(
        `/groups/${groupId}/regenerate-invite-code/`,
        {
          method: "POST",
          ...authHeaders(),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apiFetch(`/groups/${groupId}/`, {
        method: "DELETE",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

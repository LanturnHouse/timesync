import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

interface GroupWsMessage {
  type: string;
  payload: Record<string, unknown>;
}

export function useGroupWebSocket(groupId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!groupId) return;

    const token = getAccessToken();
    if (!token) return;

    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/groups/${groupId}/?token=${token}`
    );

    ws.onopen = () => {
      // Connected
    };

    ws.onmessage = (event) => {
      try {
        const data: GroupWsMessage = JSON.parse(event.data);
        handleMessage(data);
      } catch {
        // Ignore invalid JSON
      }
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [groupId]);

  const handleMessage = useCallback(
    (msg: GroupWsMessage) => {
      switch (msg.type) {
        case "event.created":
        case "event.updated":
        case "event.deleted":
          queryClient.invalidateQueries({ queryKey: ["events"] });
          break;
        case "comment.new":
        case "comment.updated":
        case "comment.deleted":
          queryClient.invalidateQueries({ queryKey: ["comments"] });
          break;
        case "poll.created":
        case "poll.voted":
          queryClient.invalidateQueries({ queryKey: ["polls"] });
          break;
        case "boost.created":
          queryClient.invalidateQueries({ queryKey: ["boosts"] });
          queryClient.invalidateQueries({ queryKey: ["groups"] });
          break;
        case "boost.transferred":
        case "subscription.renewed":
        case "subscription.cancelled":
        case "subscription.expired":
        case "subscription.payment_failed":
          queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
          queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
          queryClient.invalidateQueries({ queryKey: ["my-subscriptions-all"] });
          queryClient.invalidateQueries({ queryKey: ["groups"] });
          break;
        default:
          break;
      }
    },
    [queryClient]
  );

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef;
}

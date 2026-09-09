import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { emitEvent, EVENTS } from './useEventBus';

export const useGlobalWebSocket = () => {
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = new SockJS('http://localhost:8088/ws');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      onConnect: async () => {
        stompClient.subscribe('/user/queue/notifications', (message) => {
          try {
            emitEvent(EVENTS.NOTIFICATION, JSON.parse(message.body));
          } catch (e) {}
        });

        try {
          const res = await fetch(`http://localhost:8083/api/projects/my-project-ids`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.ok) {
            const projectIds = await res.json();
            
            projectIds.forEach(projectId => {
              stompClient.subscribe(`/topic/project/${projectId}`, (message) => {
                try {
                  const eventData = JSON.parse(message.body);
                  const type = (eventData.type || "").toUpperCase();
                  const payload = eventData.payload || {};

                  if (type.includes("TASK")) emitEvent(EVENTS.TASK, { type, payload });
                  if (type.includes("COMMENT")) emitEvent(EVENTS.COMMENT, { type, payload });
                  if (type.includes("ATTACHMENT")) emitEvent(EVENTS.ATTACHMENT, { type, payload });
                  if (type.includes("PROJECT")) emitEvent(EVENTS.PROJECT, { type, payload });
                  if (type.includes("MEMBER")) emitEvent(EVENTS.MEMBER, { type, payload });

                  emitEvent(EVENTS.NOTIFICATION);
                } catch (e) {
                  console.error("Lỗi parse WS message:", e);
                }
              });
            });
          }
        } catch (err) {
          console.error("Lỗi fetch danh sách dự án cho WebSocket:", err);
        }
      },
      onStompError: (frame) => {
        console.error("Broker error: " + frame.headers['message']);
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, []);
};
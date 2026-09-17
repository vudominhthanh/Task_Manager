import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import apiClient from "../utils/apiClient";
import { emitEvent, EVENTS, useEvent } from "./useEventBus";

export const useGlobalWebSocket = () => {
  const stompClientRef = useRef(null);
  const activeSubsRef = useRef(new Set());
  const location = useLocation();

  const subscribeTopic = (topic) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) return;
    if (activeSubsRef.current.has(topic)) return;

    activeSubsRef.current.add(topic);

    stompClientRef.current.subscribe(topic, (message) => {
      try {
        let eventData = JSON.parse(message.body);
        if (typeof eventData === "string") {
          eventData = JSON.parse(eventData);
        }

        if (
          topic === "/topic/broadcast" ||
          (eventData.type && eventData.type.includes("BROADCAST")) ||
          eventData.type === "SYSTEM_ALERT"
        ) {
          emitEvent(EVENTS.BROADCAST, {
            message:
              eventData.message ||
              (eventData.payload && eventData.payload.message) ||
              "Thông báo hệ thống",
            timestamp: eventData.timestamp || Date.now(),
          });
          return;
        }

        const type = (eventData.type || "").toUpperCase();
        const payload = eventData.payload || {};

        if (type.includes("TASK") || type.includes("SUB_TASK"))
          emitEvent(EVENTS.TASK, { type, payload });
        if (type.includes("COMMENT"))
          emitEvent(EVENTS.COMMENT, { type, payload });
        if (type.includes("ATTACHMENT"))
          emitEvent(EVENTS.ATTACHMENT, { type, payload });
        if (type.includes("PROJECT"))
          emitEvent(EVENTS.PROJECT, { type, payload });
        if (type.includes("MEMBER"))
          emitEvent(EVENTS.MEMBER, { type, payload });
        if (type.includes("USER")) emitEvent(EVENTS.USER, { type, payload });

        let prefs = {
          taskAssigned: true,
          taskStatusChanged: true,
          commentMention: true,
          projectActivities: true,
        };

        try {
          const savedPrefs = localStorage.getItem("notification_preferences");
          if (savedPrefs) prefs = { ...prefs, ...JSON.parse(savedPrefs) };
        } catch (err) {
          console.error("Lỗi đọc cấu hình thông báo:", err);
        }

        const isMuted =
          (!prefs.taskAssigned &&
            (type === "TASK_CREATED" || type === "SUB_TASK_CREATED")) ||
          (!prefs.taskStatusChanged && type === "TASK_STATUS_UPDATED") ||
          (!prefs.commentMention && type.includes("COMMENT")) ||
          (!prefs.projectActivities &&
            (type.includes("MEMBER") || type.includes("PROJECT")));

        if (!isMuted) {
          emitEvent(EVENTS.NOTIFICATION, { type, payload });
        }
      } catch (e) {
        console.error("❌ [WS LỖI PARSE]:", e, message.body);
      }
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = new SockJS("http://localhost:8088/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: { Authorization: `Bearer ${token}` },

      onConnect: async () => {
        subscribeTopic("/topic/broadcast");
        subscribeTopic("/user/queue/notifications");
        subscribeTopic("/topic/projects");

        const currentPath = window.location.pathname;
        const pathMatch = currentPath.match(/\/project\/([a-zA-Z0-9-]+)/);
        if (pathMatch && pathMatch[1]) {
          subscribeTopic(`/topic/project/${pathMatch[1]}`);
        }

        try {
          const res = await apiClient.get(
            `http://localhost:8083/api/projects/my-project-ids`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.ok) {
            const ids = await res.json();
            ids.forEach((id) => subscribeTopic(`/topic/project/${id}`));
          }
        } catch (err) {
          console.error("❌ [WS API LỖI] Không thể lấy danh sách dự án", err);
        }
      },
      onDisconnect: () => {
        activeSubsRef.current.clear();
      },
    });

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
      activeSubsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const pathMatch = location.pathname.match(/\/project\/([a-zA-Z0-9-]+)/);
    if (pathMatch && pathMatch[1]) {
      subscribeTopic(`/topic/project/${pathMatch[1]}`);
    }
  }, [location.pathname]);
};

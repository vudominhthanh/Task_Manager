import { useEffect, useRef } from "react";

export const EVENTS = {
  TASK: "event:task",             
  COMMENT: "event:comment",       
  ATTACHMENT: "event:attachment",
  PROJECT: "event:project",       
  MEMBER: "event:member",         
  NOTIFICATION: "event:notification", 
};



export const emitEvent = (eventName, data = {}) => {
  window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
};

export const useEvent = (eventName, callback) => {
  const callbackRef = useRef(callback); 

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!eventName) return;

    const handler = (e) => {
      if (callbackRef.current) {
        callbackRef.current(e.detail);
      }
    };

    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName]);
};
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { getApiBaseUrl, getSessionToken } from "../lib/config";

export function useWhatsAppSocket(onNewExpense) {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef(null);

  const onNewExpenseRef = useRef(onNewExpense);
  useEffect(() => {
    onNewExpenseRef.current = onNewExpense;
  }, [onNewExpense]);

  useEffect(() => {
    const socketUrl = getApiBaseUrl();
    const token = getSessionToken();

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connected", () => {
      setIsSocketConnected(true);
    });

    socket.on("unauthenticated", () => {
      setIsSocketConnected(false);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socket.on("novo_gasto", (expense) => {
      if (onNewExpenseRef.current) {
        onNewExpenseRef.current(expense);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { isSocketConnected };
}

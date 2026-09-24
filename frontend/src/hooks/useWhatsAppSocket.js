import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { getApiBaseUrl } from "../lib/config";

export function useWhatsAppSocket(onNewGasto) {
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  // Keep a ref to the latest callback to avoid reconnecting when it changes
  const onNewGastoRef = useRef(onNewGasto);
  useEffect(() => {
    onNewGastoRef.current = onNewGasto;
  }, [onNewGasto]);

  useEffect(() => {
    const socketUrl = getApiBaseUrl();
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connected", () => {
      setSocketConnected(true);
    });

    socket.on("unauthenticated", () => {
      setSocketConnected(false);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("novo_gasto", (gasto) => {
      if (onNewGastoRef.current) {
        onNewGastoRef.current(gasto);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // Only run once — stable socket lifecycle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    socketConnected,
  };
}

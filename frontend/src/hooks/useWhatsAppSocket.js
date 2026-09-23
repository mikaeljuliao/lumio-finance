import { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";

export function useWhatsAppSocket(onNewGasto) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const socketRef = useRef(null);

  const connectWhatsApp = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("connect_whatsapp");
    }
  }, []);

  const disconnectWhatsApp = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("disconnect_whatsapp");
    }
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("qr", (qr) => {
      setQrCode(qr);
      setSocketConnected(false);
    });

    socket.on("connected", () => {
      setQrCode(null);
      setSocketConnected(true);
    });

    socket.on("disconnected", () => {
      setQrCode(null);
      setSocketConnected(false);
    });

    socket.on("novo_gasto", (gasto) => {
      if (onNewGasto) {
        onNewGasto(gasto);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [onNewGasto]);

  return {
    socketConnected,
    qrCode,
    connectWhatsApp,
    disconnectWhatsApp
  };
}

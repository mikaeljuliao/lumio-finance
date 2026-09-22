import { useState, useEffect } from "react";
import io from "socket.io-client";

export function useWhatsAppSocket(onNewGasto) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("qr", (qr) => {
      setQrCode(qr);
      setSocketConnected(false);
    });

    socket.on("connected", () => {
      setQrCode(null);
      setSocketConnected(true);
    });

    socket.on("disconnected", () => {
      setSocketConnected(false);
    });

    socket.on("novo_gasto", (gasto) => {
      if (onNewGasto) {
        onNewGasto(gasto);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onNewGasto]);

  return {
    socketConnected,
    qrCode
  };
}

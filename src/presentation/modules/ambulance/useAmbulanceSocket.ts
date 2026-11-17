import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

/** Ambulance realtime push (namespace /ambulance via the gateway). HTTP polling stays the source of truth; this only speeds it up. */
export type PresenceEvent = { driver_id: string; lat: number | null; lng: number | null; heading: number | null; speed: number | null; status: string; trip_id: string | null; at: string };
export type TripStatusEvent = { trip_id: string; status: string; driver_id: string | null; at: string; eta: number | null };
export type OfferNewEvent = { offer_id: string; request_id: string; at: string };
type Handlers = { presence?: (e: PresenceEvent) => void; "trip.status"?: (e: TripStatusEvent) => void; "offer.new"?: (e: OfferNewEvent) => void };

const API_URL = ((import.meta.env.VITE_API_URL as string) || "http://localhost:3000").replace(/\/$/, "");

function sessionToken(): string | null {
  try {
    const u = JSON.parse(localStorage.getItem("vizito_user") || "{}");
    return u?.token || localStorage.getItem("vizito_token");
  } catch { return localStorage.getItem("vizito_token"); }
}

// One shared connection per tab; listeners attach per hook.
let shared: Socket | null = null;
let users = 0;
function acquire(): Socket | null {
  const token = sessionToken();
  if (!token) return null;
  if (!shared) {
    shared = io(`${API_URL}/ambulance`, { transports: ["websocket"], query: { token }, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000 });
    // Token may rotate on refresh: pick up the newest one before every reconnect.
    shared.io.on("reconnect_attempt", () => { const t = sessionToken(); if (t && shared) shared.io.opts.query = { token: t }; });
  }
  users++;
  return shared;
}
function release() {
  users = Math.max(0, users - 1);
  if (!users && shared) { shared.disconnect(); shared = null; }
}

/** Subscribe to ambulance events; `tripId` also joins that trip's room. Returns whether the socket is connected. */
export function useAmbulanceSocket(handlers: Handlers, opts: { tripId?: string | null; enabled?: boolean } = {}) {
  const ref = useRef(handlers);
  ref.current = handlers;
  const [connected, setConnected] = useState(false);
  const { tripId = null, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;
    const s = acquire();
    if (!s) return;
    const join = () => { setConnected(true); if (tripId) s.emit("subscribe", { tripId }); };
    const drop = () => setConnected(false);
    const presence = (e: PresenceEvent) => ref.current.presence?.(e);
    const status = (e: TripStatusEvent) => ref.current["trip.status"]?.(e);
    const offer = (e: OfferNewEvent) => { ref.current["offer.new"]?.(e); window.dispatchEvent(new CustomEvent("ambulance:offer.new", { detail: e })); };
    s.on("connect", join); s.on("disconnect", drop); s.on("connect_error", drop);
    s.on("presence", presence); s.on("trip.status", status); s.on("offer.new", offer);
    if (s.connected) join();
    return () => {
      s.off("connect", join); s.off("disconnect", drop); s.off("connect_error", drop);
      s.off("presence", presence); s.off("trip.status", status); s.off("offer.new", offer);
      if (tripId && s.connected) s.emit("unsubscribe", { tripId });
      release();
    };
  }, [enabled, tripId]);

  return connected;
}

"use client";

let pusherInstance = null;

export function getPusherClient() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  if (!pusherInstance) {
    const Pusher = require("pusher-js");
    pusherInstance = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      auth: {
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("token") || "" : ""}`,
        },
      },
    });
  }

  return pusherInstance;
}

export function isPusherEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

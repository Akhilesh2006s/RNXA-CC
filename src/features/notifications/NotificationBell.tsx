"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { notificationsFeedQueryKey, useNotificationsFeed } from "@/hooks/use-notifications-feed";
import { apiClient } from "@/lib/api-client";

function invalidateFeed(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: notificationsFeedQueryKey });
}

type PanelPos = { top: number; left: number; width: number; maxHeight: number };

function computePanelPos(button: HTMLButtonElement): PanelPos {
  const margin = 12;
  const width = Math.min(352, window.innerWidth - margin * 2);
  const rect = button.getBoundingClientRect();

  let left = rect.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const preferredMax = 420;
  const openBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;

  let top: number;
  let maxHeight: number;

  if (openBelow) {
    top = rect.bottom + margin;
    maxHeight = Math.min(preferredMax, spaceBelow);
  } else {
    maxHeight = Math.min(preferredMax, spaceAbove);
    top = Math.max(margin, rect.top - maxHeight - margin);
  }

  return { top, left, width, maxHeight: Math.max(160, maxHeight) };
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const feed = useNotificationsFeed();

  useEffect(() => {
    function handleDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleDoc);
    return () => document.removeEventListener("mousedown", handleDoc);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPanelPos(null);
      return;
    }

    const update = () => {
      if (buttonRef.current) setPanelPos(computePanelPos(buttonRef.current));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, feed.data?.length]);

  const readOne = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => invalidateFeed(qc)
  });

  const readAll = useMutation({
    mutationFn: () => apiClient.patch("/notifications/read-all"),
    onSuccess: () => invalidateFeed(qc)
  });

  const items = feed.data ?? [];
  const unread = items.filter((n) => !n.readAt).length;
  const preview = items.slice(0, 8);

  const layer =
    typeof document !== "undefined" && open && panelPos ? (
      <AnimatePresence>
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          aria-modal="true"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            top: panelPos.top,
            left: panelPos.left,
            width: panelPos.width,
            maxHeight: panelPos.maxHeight,
            zIndex: 200
          }}
          className="flex flex-col overflow-hidden rounded-xl border border-gold/30 bg-surface-card shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gold/20 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Alerts</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-[11px] text-gold-bright hover:underline disabled:opacity-50"
                disabled={readAll.isPending}
                onClick={() => readAll.mutate()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {preview.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted">No notifications yet.</p>
            )}
            {preview.map((n) => (
              <div
                key={n._id}
                className={`border-b border-gold/10 px-3 py-2.5 last:border-0 ${
                  !n.readAt ? "bg-gold/[0.06]" : "opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{n.message}</p>
                    {n.type && (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-gold/70">{n.type}</p>
                    )}
                  </div>
                  {!n.readAt && (
                    <button
                      type="button"
                      className="shrink-0 text-[10px] text-gold-bright hover:underline"
                      onClick={() => readOne.mutate(n._id)}
                    >
                      Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-gold/20 bg-surface-lift px-2 py-2">
            <Link
              href="/notifications"
              className="block w-full rounded-lg py-2 text-center text-xs font-medium text-gold-bright transition-colors hover:bg-surface-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              onClick={() => setOpen(false)}
            >
              Open notification center
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    ) : null;

  return (
    <div className="relative z-20" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gold/25 bg-surface-lift text-gold-bright transition-colors hover:bg-surface-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        aria-expanded={open}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-gold px-1 py-0 text-center text-[10px] font-semibold leading-none text-[#070d24]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {layer && createPortal(layer, document.body)}
    </div>
  );
}

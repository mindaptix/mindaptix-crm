"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReminderResponse = { reminder: { title: string; message: string; sourceKey: string } | null };

function indiaTimeKey() {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date());
}

export function EndOfDayBrowserNotifier({ enabled }: { enabled: boolean }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !("Notification" in window)) return;
    setPermission(Notification.permission);
    let active = true;
    const checkForReminder = async () => {
      if (!active || indiaTimeKey() < "18:00") return;
      try {
        const response = await fetch("/api/notifications/end-of-day", { cache: "no-store" });
        if (!response.ok) return;
        const { reminder } = await response.json() as ReminderResponse;
        if (!reminder) return;
        router.refresh();
        if (Notification.permission !== "granted") return;
        const storageKey = `mindaptix:desktop-reminder:${reminder.sourceKey}`;
        if (sessionStorage.getItem(storageKey)) return;
        new Notification(reminder.title, { body: reminder.message, tag: reminder.sourceKey });
        sessionStorage.setItem(storageKey, "shown");
      } catch {
        // CRM notifications are still created by the server when browser delivery is unavailable.
      }
    };
    void checkForReminder();
    const interval = window.setInterval(checkForReminder, 60_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [enabled, router]);

  if (!enabled || permission !== "default") return null;
  return <button className="fixed bottom-4 right-4 z-30 rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-semibold text-violet-700 shadow-lg hover:bg-violet-50" onClick={async () => setPermission(await Notification.requestPermission())} type="button">Enable desktop reminders</button>;
}

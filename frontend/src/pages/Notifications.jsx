import React, { useMemo, useState } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../utils/appData';
import DashboardNavbar from '../components/DashboardNavbar';
import { ListSkeleton } from '../components/Skeleton';
import { useEffect } from 'react';

function NotificationItem({ item, onRead }) {
  const accent = !item.read;
  return (
    <article className={`rounded-sm border p-6 transition-all ${accent ? 'border-[#0052ff]/30 bg-[#0052ff]/5 shadow-sm' : 'border-[#e2e8f0] bg-white shadow-sm hover:shadow-md'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {accent && <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#0052ff]" />}
            <p className={`text-[16px] ${accent ? 'font-bold text-[#0a0b0d]' : 'font-semibold text-[#0a0b0d]/80'}`}>{item.title}</p>
          </div>
          <p className={`mt-2 text-[15px] leading-relaxed ${accent ? 'text-[#0a0b0d]/80' : 'text-[#5b616e]'}`}>{item.desc}</p>
          {accent && (
            <button type="button" onClick={() => onRead(item.id)} className="mt-4 rounded-sm border border-[#0052ff]/20 bg-white px-5 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#0052ff] transition-colors hover:bg-[#0052ff] hover:text-white">
              Mark as read
            </button>
          )}
        </div>
        <span className="shrink-0 text-[13px] font-medium text-[#5b616e]">{new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </article>
  );
}

export default function Notifications() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const notifications = useMemo(() => getNotifications(), [refreshKey]);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function handleRead(notificationId) {
    markNotificationRead(notificationId);
    refresh();
  }

  function handleReadAll() {
    markAllNotificationsRead();
    refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1100px] space-y-6">
        <DashboardNavbar activePath="/notifications" />

        <header className="rounded-sm border border-[#e2e8f0] bg-white px-8 py-8 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Notifications</p>
          <h1 className="mt-2 text-[36px] font-bold leading-tight tracking-[-0.02em] text-[#0a0b0d]">Trust signals and platform updates</h1>
          <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Stay updated on profile views, connection requests, verified messages, and opportunity alerts.</p>
        </header>

        <div className="flex items-center justify-between px-2">
          <p className="text-[15px] font-medium text-[#5b616e]">Unread: <span className="font-bold text-[#0052ff]">{notifications.filter((item) => !item.read).length}</span></p>
          <button type="button" onClick={handleReadAll} className="rounded-sm border border-[#e2e8f0] bg-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#5b616e] transition-colors hover:bg-gray-50 hover:text-[#0a0b0d]">Mark all as read</button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <ListSkeleton />
          ) : (
            notifications.map((item) => (
              <NotificationItem key={item.id} item={item} onRead={handleRead} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { isBusinessRole } from '../utils/flowState';

export default function DashboardNavbar({ activePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isBusiness = isBusinessRole();
  const currentPath = activePath || location.pathname;

  const navItems = [
    { label: 'Home', path: '/home' },
    { label: 'Profile', path: '/profile' },
    { label: 'Opportunities', path: '/opportunities' },
    { label: 'Network', path: '/network' },
    { label: 'Events', path: '/events' },
    { label: 'Discover', path: '/discover' },
    { label: 'Referral', path: '/referral-rewards' },
    { label: 'Promotion', path: '/smart-promotion' },
    ...(isBusiness ? [{ label: 'Investment Trust', path: '/investment-trust' }] : []),
    { label: 'Messages', path: '/messages' },
    { label: 'Notifications', path: '/notifications' },
    { label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1380px]">
        <header className="rounded-sm border border-[rgba(91,97,110,0.16)] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(10,11,13,0.08)] sm:px-5">
          <div className="flex flex-nowrap items-center gap-3">
            <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] transition-colors ${
                    item.path === currentPath
                      ? 'border border-[#0052ff] bg-[#0052ff] text-white shadow-[0_2px_8px_rgba(0,82,255,0.2)]'
                      : 'border border-[rgba(91,97,110,0.22)] bg-white text-[#2a3141] hover:border-[#0052ff] hover:bg-[#f8fbff] hover:text-[#0052ff]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => navigate('/create-post')}
              className="ml-1 shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-[#0052ff] text-white transition-colors hover:bg-[#0046d8]"
              aria-label={isBusiness ? 'Create Campaign' : 'Create Post'}
              title={isBusiness ? 'Create Campaign' : 'Create Post'}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </header>
      </div>
    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/flowState';
import { getSettings, updateSetting } from '../utils/appData';
import DashboardNavbar from '../components/DashboardNavbar';

function SettingRow({ title, desc, enabled = false, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-6 py-6 border-b border-[#e2e8f0] last:border-0">
      <div className="flex-1">
        <p className="text-[16px] font-bold text-[#0a0b0d]">{title}</p>
        <p className="mt-1.5 text-[14px] text-[#5b616e] leading-relaxed">{desc}</p>
      </div>
      <button 
        type="button" 
        onClick={onToggle} 
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-sm transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-[#0052ff]' : 'bg-[#e2e8f0]'}`}
      >
        <span 
          className={`inline-block h-5 w-5 transform rounded-sm bg-white transition duration-200 ease-in-out shadow-sm ${enabled ? 'translate-x-[22px]' : 'translate-x-1'}`} 
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const settings = React.useMemo(() => getSettings(), [refreshKey]);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function toggle(key) {
    const newValue = !settings[key];
    updateSetting(key, newValue);
    
    // Immediately apply global CSS class for dark mode
    if (key === 'darkMode') {
      if (newValue) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
    
    refresh();
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1100px] space-y-6">
        <DashboardNavbar activePath="/settings" />

        <header className="rounded-sm border border-[#e2e8f0] bg-white px-8 py-8 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Settings</p>
          <h1 className="mt-2 text-[36px] font-bold leading-tight tracking-[-0.02em] text-[#0a0b0d]">Trust and account preferences</h1>
          <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Manage privacy, security, notifications, and verification preferences from one central place.</p>
        </header>

        <section className="rounded-sm border border-[#e2e8f0] bg-white shadow-sm">
          <div className="border-b border-[#e2e8f0] bg-[#fafbfd] px-8 py-5">
            <h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-[#0a0b0d]">Account Preferences</h2>
          </div>
          <div className="px-8">
            <SettingRow title="Profile visibility" desc="Allow verified people to discover your public profile." enabled={settings.profileVisibility} onToggle={() => toggle('profileVisibility')} />
            <SettingRow title="Message requests" desc="Receive messages only from verified connections and businesses." enabled={settings.messageRequests} onToggle={() => toggle('messageRequests')} />
            <SettingRow title="Opportunity alerts" desc="Get notified when matching jobs, events, or partnerships are available." enabled={settings.opportunityAlerts} onToggle={() => toggle('opportunityAlerts')} />
            <SettingRow title="Digest emails" desc="Weekly summary of activity, opportunities, and trust signals." enabled={settings.digestEmails} onToggle={() => toggle('digestEmails')} />
          </div>
        </section>

        <section className="rounded-sm border border-[#e2e8f0] bg-white shadow-sm">
          <div className="border-b border-[#e2e8f0] bg-[#fafbfd] px-8 py-5">
            <h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-[#0a0b0d]">Appearance</h2>
          </div>
          <div className="px-8">
            <SettingRow title="Dark Mode" desc="Switch between light and dark themes for a comfortable viewing experience." enabled={settings.darkMode} onToggle={() => toggle('darkMode')} />
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-sm border border-[#e2e8f0] bg-white shadow-sm flex flex-col">
            <div className="border-b border-[#e2e8f0] bg-[#fafbfd] px-8 py-5">
              <h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-[#0a0b0d]">Security</h2>
            </div>
            <div className="p-8 flex-1">
              <p className="text-[15px] leading-relaxed text-[#5b616e]">Manage your password, 2FA status, and active sessions across your devices.</p>
              <button type="button" className="mt-6 rounded-sm border border-[#e2e8f0] bg-white px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#0a0b0d] transition-colors hover:bg-gray-50">Manage Security</button>
            </div>
          </section>

          <section className="rounded-sm border border-[#e2e8f0] bg-white shadow-sm flex flex-col">
            <div className="border-b border-[#e2e8f0] bg-[#fafbfd] px-8 py-5">
              <h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-[#0a0b0d]">Platform Trust</h2>
            </div>
            <div className="p-8 flex-1">
              <p className="text-[15px] leading-relaxed text-[#5b616e]">Your trust settings decide how far your profile can go in the Sync-Up network.</p>
              <button type="button" className="mt-6 rounded-sm border border-[#e2e8f0] bg-white px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#0a0b0d] transition-colors hover:bg-gray-50">View Trust Score</button>
            </div>
          </section>
        </div>

        <section className="rounded-sm border border-[#ef4444]/20 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#e2e8f0] bg-[#fafbfd] px-8 py-5">
            <h2 className="text-[14px] font-bold uppercase tracking-[0.1em] text-[#ef4444]">Danger Zone</h2>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8">
            <div>
              <p className="text-[16px] font-bold text-[#0a0b0d]">End Session</p>
              <p className="mt-1.5 text-[14px] text-[#5b616e] leading-relaxed">Sign out from this device and return to the login screen securely.</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-sm bg-[#ef4444] px-8 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#dc2626]"
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

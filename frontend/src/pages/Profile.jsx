import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Globe,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  ShieldCheck,
  Trash2,
  X,
  MessageSquare,
  Heart,
  Sparkles,
} from 'lucide-react';
import { getProfile, updateProfile } from '../utils/appData';
import { getPosts, likePost, commentPost } from '../utils/api';
import { getUser } from '../utils/flowState';
import { uploadFile } from '../utils/imagekit';
import DashboardNavbar from '../components/DashboardNavbar';
import EditProfileModal from '../components/EditProfileModal';
import CompanyVerificationUI from '../components/CompanyVerificationUI';
import ProfileAIChat from '../components/ProfileAIChat';
import { Skeleton, ListSkeleton } from '../components/Skeleton';

const proofItems = [
  { text: 'Govt ID Verified', level: 'LEVEL 4' },
  { text: '2FA Enabled', level: 'HARDWARE' },
  { text: 'Clean Escrow History', level: 'VERIFIED' },
  { text: 'Biometric Linked', level: 'ACTIVE' },
];

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function toEditableProfile(profile) {
  const parsed = splitName(profile?.name);
  const normalizedLanguages = Array.isArray(profile?.languages) && profile.languages.length > 0
    ? profile.languages
    : ['English (Native)', 'German (C2)'];
  const normalizedEducations = Array.isArray(profile?.educations)
    ? profile.educations.filter(Boolean)
    : [String(profile?.education || '').trim()].filter(Boolean);

  return {
    name: profile?.name || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || 'Verified User',
    firstName: profile?.firstName || parsed.firstName,
    lastName: profile?.lastName || parsed.lastName,
    email: profile?.email || '',
    mobile: profile?.mobile || '',
    additionalName: profile?.additionalName || '',
    pronouns: profile?.pronouns || '',
    headline: profile?.headline === 'Verified professional' ? '' : (profile?.headline || ''),
    currentPosition: profile?.currentPosition || '',
    industry: profile?.industry || '',
    educations: normalizedEducations.length > 0 ? normalizedEducations : [''],
    country: profile?.country || 'India',
    state: profile?.state || '',
    city: profile?.city || 'Pune',
    postalCode: profile?.postalCode || '',
    showCurrentPosition: profile?.showCurrentPosition ?? true,
    showEducation: profile?.showEducation ?? true,
    about: profile?.about || '',
    skills: profile?.skills || '',
    languages: normalizedLanguages,
    links: Array.isArray(profile?.links) ? profile.links.map((item, index) => ({
      id: item?.id || `link-${index}`,
      url: String(item?.url || '').trim(),
    })).filter((item) => item.url) : [],
    openTo: profile?.openTo || '',
    photoUrl: profile?.photoUrl || '',
    postsCount: Number.isFinite(profile?.postsCount) ? profile.postsCount : 0,
    connectionsCount: Number.isFinite(profile?.connectionsCount) ? profile.connectionsCount : 0,
    chatsCount: Number.isFinite(profile?.chatsCount) ? profile.chatsCount : 0,
  };
}

function normalizeProfileForSave(draft) {
  const firstName = String(draft.firstName || '').trim();
  const lastName = String(draft.lastName || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const educations = (draft.educations || []).map((item) => String(item || '').trim()).filter(Boolean);
  const languages = (draft.languages || []).map((item) => String(item || '').trim()).filter(Boolean);
  const links = (draft.links || []).map((item, index) => ({
    id: item?.id || `link-${index}`,
    url: String(item?.url || '').trim(),
  })).filter((item) => item.url);

  return {
    ...draft,
    firstName,
    lastName,
    name: fullName || 'Verified User',
    educations,
    education: educations[0] || '',
    languages,
    links,
    photoUrl: draft.photoUrl || '',
  };
}

function detectLinkMeta(rawUrl) {
  const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('linkedin.com')) {
      return { icon: Link2, label: 'LinkedIn', display: parsed.pathname.replace(/^\//, '') || parsed.hostname };
    }
    if (host.includes('github.com')) {
      return { icon: Globe, label: 'GitHub', display: parsed.pathname.replace(/^\//, '') || parsed.hostname };
    }
    if (host.includes('portfolio') || host.includes('behance.net') || host.includes('dribbble.com')) {
      return { icon: Globe, label: 'Portfolio', display: parsed.hostname + parsed.pathname };
    }

    return { icon: Link2, label: 'Link', display: parsed.hostname + parsed.pathname };
  } catch {
    return { icon: Link2, label: 'Link', display: rawUrl };
  }
}

function buildProfessionalSubtitle(currentPosition, industry) {
  const position = String(currentPosition || '').trim();
  const company = String(industry || '').trim();

  if (position && company) {
    return `${position} at ${company}`;
  }

  return position || company || 'Verified professional';
}

function formatLocation(city, state, country) {
  return [city, state, country].map((part) => String(part || '').trim()).filter(Boolean).join(', ');
}

function formatHandleFromUrl(url) {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./i, '');
    const path = parsed.pathname.replace(/^\//, '');

    if (host.includes('linkedin.com')) {
      return path || host;
    }

    if (host.includes('github.com')) {
      return `${host}/${path}`.replace(/\/$/, '');
    }

    return `${host}${path ? `/${path}` : ''}`;
  } catch {
    return url;
  }
}

function CircularTrust({ progress }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative mx-auto mt-6 h-24 w-24">
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
        <circle cx="42" cy="42" r={radius} stroke="#E2E8F0" strokeWidth="8" fill="none" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          stroke="#0066FF"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[20px] font-semibold text-[#0F172A]">{clamped}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">Level</p>
      </div>
    </div>
  );
}

function Sparkline({ points }) {
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-20">
      <polyline
        points={points}
        fill="none"
        stroke="#0066FF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({ label, value, spark }) {
  return (
    <section className="rounded-sm border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[24px] font-semibold leading-none text-[#0F172A]">{value}</p>
        <Sparkline points={spark} />
      </div>
    </section>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const storedProfile = useMemo(() => toEditableProfile(getProfile()), []);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState('all');
  const [profileInfo, setProfileInfo] = useState(storedProfile);
  const [draftInfo, setDraftInfo] = useState(profileInfo);
  const [isUploading, setIsUploading] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostContent, setEditingPostContent] = useState('');
  const [editingPostTag, setEditingPostTag] = useState('');
  const [editingPostAttachments, setEditingPostAttachments] = useState([]);
  const [editingPostNewImages, setEditingPostNewImages] = useState([]);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const result = await uploadFile(file, `profile-${Date.now()}`, ['profile-photo']);
      const updated = updateProfile({ photoUrl: result.url });
      setProfileInfo(toEditableProfile(updated));
      setDraftInfo(toEditableProfile(updated));
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('Failed to upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const realUser = useMemo(() => getUser() || {}, []);

  function refreshProfile() {
    const latest = toEditableProfile(getProfile());
    // Override with real database name
    latest.name = realUser.name || 'Verified User';
    setProfileInfo(latest);
    setDraftInfo(latest);
  }

  useEffect(() => {
    refreshProfile();
    
    async function loadMyPosts() {
      try {
        const posts = await getPosts();
        setMyPosts(posts.filter(p => p.authorId === realUser.id));
      } catch (err) {
        console.error("Failed to load my posts", err);
      }
    }
    loadMyPosts();

    function handleWindowFocus() {
      refreshProfile();
      loadMyPosts();
    }

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [realUser.id]);

  function handleEditStart(mode = 'all') {
    setDraftInfo(profileInfo);
    setEditMode(mode);
    setIsEditing(true);
  }

  function handleEditCancel() {
    setDraftInfo(profileInfo);
    setIsEditing(false);
  }

  function handleEditSave() {
    const normalized = normalizeProfileForSave(draftInfo);
    const saved = toEditableProfile(updateProfile(normalized));
    setProfileInfo(saved);
    setDraftInfo(saved);
    setIsEditing(false);
  }

  function handleFieldChange(field, value) {
    setDraftInfo((prev) => ({ ...prev, [field]: value }));
  }

  const initials = (profileInfo.name || 'Verified User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();

  const trustLevel = Math.max(65, Math.min(99, 72 + profileInfo.connectionsCount * 2 + profileInfo.postsCount));
  const eventsOrganized = Math.max(8, profileInfo.postsCount * 2 + 6);
  const escrowSuccess = `${Math.max(95, Math.min(99.9, 96 + profileInfo.connectionsCount * 0.15)).toFixed(1)}%`;
  const verifiedConnections = Math.max(120, profileInfo.connectionsCount * 90);
  const skillList = String(profileInfo.skills || '')
    .split(/[\n,]/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 4);
  const languageList = Array.isArray(profileInfo.languages) && profileInfo.languages.length > 0
    ? profileInfo.languages
    : ['English (Native)', 'German (C2)'];
  const educationList = Array.isArray(profileInfo.educations)
    ? profileInfo.educations.filter(Boolean)
    : [];
  const locationLabel = formatLocation(profileInfo.city, profileInfo.state, profileInfo.country) || 'Location not set';
  const professionalSubtitle = buildProfessionalSubtitle(profileInfo.currentPosition, profileInfo.industry);
  const companyBadgeLabel = String(profileInfo.industry || '').trim();
  const headerLinks = [
    profileInfo.mobile ? { id: 'mobile', icon: Phone, label: 'Mobile', value: profileInfo.mobile, href: `tel:${profileInfo.mobile}` } : null,
    profileInfo.email ? { id: 'email', icon: Mail, label: 'Email', value: profileInfo.email, href: `mailto:${profileInfo.email}` } : null,
    profileInfo.links?.find((item) => /linkedin\.com/i.test(item.url))
      ? (() => {
        const item = profileInfo.links.find((link) => /linkedin\.com/i.test(link.url));
        const meta = detectLinkMeta(item.url);
        return { id: item.id, icon: meta.icon, label: meta.label, value: formatHandleFromUrl(item.url), href: /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}` };
      })()
      : null,
    profileInfo.links?.find((item) => /github\.com/i.test(item.url))
      ? (() => {
        const item = profileInfo.links.find((link) => /github\.com/i.test(link.url));
        const meta = detectLinkMeta(item.url);
        return { id: item.id, icon: meta.icon, label: meta.label, value: formatHandleFromUrl(item.url), href: /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}` };
      })()
      : null,
    locationLabel ? { id: 'location', icon: MapPin, label: 'Location', value: locationLabel, href: '#' } : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-[#0F172A] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1380px] space-y-6">
        <DashboardNavbar activePath="/profile" />

        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_260px] items-start">
          <div className="space-y-5 lg:sticky lg:top-6">
            <section className="rounded-sm border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="relative mx-auto w-fit group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                {isLoading ? (
                  <Skeleton className="h-24 w-24 rounded-full border-4 border-[#E2E8F0]" />
                ) : profileInfo.photoUrl ? (
                  <img src={profileInfo.photoUrl} alt={profileInfo.name} className="h-24 w-24 rounded-full border-4 border-[#E2E8F0] object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#E2E8F0] bg-[#0F172A] text-2xl font-semibold text-white">{initials}</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Pencil size={20} className="text-white" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#0066FF] text-white">
                  <ShieldCheck size={14} />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isLoading ? (
                      <Skeleton className="h-7 w-48" />
                    ) : (
                      <>
                        <p className="text-[18px] font-semibold tracking-[-0.01em] text-[#0F172A]">{profileInfo.name}</p>
                        <span className="inline-flex items-center gap-1 rounded-sm bg-[#EFF6FF] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#0066FF]">
                          <ShieldCheck size={12} /> Verified
                        </span>
                        {profileInfo.pronouns ? (
                          <span className="rounded-sm bg-[#F1F5F9] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
                            {profileInfo.pronouns}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  {isLoading ? (
                    <div className="mt-2 space-y-2">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-sm font-semibold tracking-[-0.01em] text-[#424656]">{professionalSubtitle}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#64748B]"><MapPin size={12} /> {locationLabel}</p>
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {headerLinks.map((item) => {
                      const Icon = item.icon;
                      const isLocation = item.id === 'location';
                      const Tag = isLocation ? 'div' : 'a';
                      const tagProps = isLocation
                        ? {}
                        : {
                          href: item.href,
                          target: '_blank',
                          rel: 'noreferrer',
                        };

                      return (
                        <Tag
                          key={item.id}
                          {...tagProps}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#0F172A]"
                        >
                          <Icon size={14} className="text-[#475569]" />
                          <span className="truncate">{item.value}</span>
                        </Tag>
                      );
                    })}
                  </div>
                </div>

                {companyBadgeLabel ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#0F766E] text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                      {companyBadgeLabel.slice(0, 2) || 'Co'}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">Company</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{companyBadgeLabel}</p>
                    </div>
                  </div>
                ) : null}
              </div>
              <CircularTrust progress={trustLevel} />
              <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.06em] text-[#475569]">Trust Protocol Verified</p>
            </section>

          </div>

          <div className="space-y-6">

            <section className="p-2 lg:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(91,97,110,0.08)] pb-6">
                <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-[#0a0b0d]">Professional Profile</h2>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#0066FF]/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0066FF]">Trust Index A+</span>
                </div>
              </div>

              <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-10">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#5b616e]">Core Expertise</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {(skillList.length ? skillList : ['Zero-Knowledge Proofs (ZKP)', 'OAuth 2.0', 'Decentralized Identifiers (DID)']).map((skill) => (
                        <li key={skill} className="flex items-center rounded-full border border-[rgba(91,97,110,0.12)] bg-[#f8fafc] px-4 py-2 text-[14px] font-medium text-[#0a0b0d] hover:bg-white hover:shadow-[0_2px_8px_rgba(10,11,13,0.04)] transition-all">
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {profileInfo.showEducation && educationList.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#5b616e]">Education</p>
                      <div className="mt-5 space-y-3">
                        {educationList.map((education, index) => (
                          <div key={`${education}-${index}`} className="flex w-fit items-center gap-3 rounded-2xl border border-[rgba(91,97,110,0.08)] bg-[#f8fafc] px-4 py-3 text-[15px] font-medium text-[#0a0b0d] transition-all hover:border-[#0052ff]/20 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,82,255,0.06)]">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0052ff] shadow-sm">
                              <Globe size={16} />
                            </div>
                            <span>{education}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#5b616e]">Location</p>
                    <div className="mt-5 flex items-center gap-4 text-[15px] font-medium text-[#0a0b0d]">
                      <div className="flex w-fit items-center gap-3 rounded-2xl border border-[rgba(91,97,110,0.08)] bg-[#f8fafc] px-4 py-3 transition-all hover:border-[#0052ff]/20 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,82,255,0.06)]">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0052ff] shadow-sm">
                          <MapPin size={16} />
                        </div>
                        <span>{locationLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  {Array.isArray(profileInfo.links) && profileInfo.links.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#5b616e]">Links</p>
                      <div className="mt-5 space-y-3">
                        {profileInfo.links.map((item) => {
                          const linkMeta = detectLinkMeta(item.url);
                          const Icon = linkMeta.icon;
                          const href = /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}`;
                          return (
                            <a
                              key={item.id}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="group flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-[#f8fafc]"
                            >
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8fafc] text-[#5b616e] transition-colors group-hover:bg-[#0066FF]/10 group-hover:text-[#0066FF]">
                                <Icon size={20} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5b616e]">{linkMeta.label}</p>
                                <p className="truncate text-[15px] font-semibold text-[#0a0b0d]">{linkMeta.display}</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-12 border-t border-[rgba(91,97,110,0.08)] pt-10">
                <div className="rounded-3xl bg-[#0066FF]/5 p-8">
                  <p className="text-[16px] font-bold tracking-[-0.01em] text-[#0a0b0d]">Escrow Reliability</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5b616e]">Projects, hiring conversations, and partnerships verified by the platform protocol.</p>
                </div>
              </div>
            </section>

            <section className="mt-4 border-t border-[rgba(91,97,110,0.08)] p-2 pt-12 lg:p-4 lg:pt-16">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-[#0a0b0d]">About</h2>
                <button
                  onClick={() => handleEditStart('about')}
                  className="rounded-full bg-[#f8fafc] p-3 text-[#5b616e] transition-all hover:bg-[#0066FF]/10 hover:text-[#0066FF]"
                  aria-label="Edit about"
                >
                  <Pencil size={18} />
                </button>
              </div>

              <div className="mt-8 max-w-[800px] space-y-6 text-[17px] leading-[1.7] text-[#424656]">
                {profileInfo.about ? (
                  profileInfo.about.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))
                ) : (
                  <p className="text-sm italic text-[#64748B]">No bio provided yet. Add one to complete your profile.</p>
                )}
              </div>
            </section>

            <section className="mt-4 border-t border-[rgba(91,97,110,0.08)] p-2 pt-12 lg:p-4 lg:pt-16">
              <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-[#0a0b0d]">My Posts</h2>
              <div className="mt-8 space-y-5">
                {isLoading ? (
                  <ListSkeleton />
                ) : myPosts.length === 0 ? (
                  <p className="text-sm text-[#5b616e]">You haven't published any posts yet.</p>
                ) : (
                  myPosts.map(post => (
                    <article key={post.id} className="rounded-xl border border-[rgba(91,97,110,0.12)] bg-white p-5 shadow-[0_2px_12px_rgba(10,11,13,0.03)] transition-shadow hover:shadow-[0_4px_20px_rgba(10,11,13,0.06)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#8a909c]">{new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPostId(post.id);
                              setEditingPostContent(post.content);
                              setEditingPostTag(post.tag);
                              setEditingPostAttachments(post.attachments && post.attachments.length > 0 ? [...post.attachments] : (post.attachment ? [post.attachment] : []));
                              setEditingPostNewImages([]);
                            }}
                            className="rounded-md p-2 text-[#5b616e] transition-colors hover:bg-[#0052ff]/10 hover:text-[#0052ff]"
                            title="Edit Post"
                          >
                            <Pencil size={15} />
                          </button>
                          {confirmDeleteId === post.id ? (
                            <div className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1">
                              <span className="text-[11px] font-semibold text-red-600">Delete?</span>
                              <button
                                onClick={() => {
                                  const handleConfirmDeletePost = () => {
                                    if (!confirmDeleteId) return;
                                    setMyPosts(prev => prev.filter(p => p.id !== confirmDeleteId));
                                    setConfirmDeleteId(null);
                                  };
                                  handleConfirmDeletePost();
                                }}
                                className="rounded p-1 text-red-600 hover:bg-red-100"
                                title="Confirm Delete"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded p-1 text-[#5b616e] hover:bg-white"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(post.id)}
                              className="rounded-md p-2 text-[#5b616e] transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Delete Post"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {editingPostId === post.id ? (
                        <div className="mt-3 space-y-3 rounded-lg border border-[rgba(91,97,110,0.2)] bg-[#fafbfd] p-4">
                          <textarea
                            value={editingPostContent}
                            onChange={(e) => setEditingPostContent(e.target.value)}
                            className="w-full resize-none rounded-md border border-[rgba(91,97,110,0.2)] bg-white p-3 text-sm text-[#0a0b0d] outline-none focus:border-[#0052ff]"
                            rows={3}
                          />
                          {(editingPostAttachments.length > 0 || editingPostNewImages.length > 0) && (
                            <div className="flex gap-3 overflow-x-auto py-2">
                              {editingPostAttachments.map((url, i) => (
                                <div key={i} className="relative group shrink-0">
                                  <img src={url} alt="attachment" className="h-16 w-16 rounded-md object-cover border border-[rgba(91,97,110,0.2)]" />
                                  <button onClick={() => setEditingPostAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"><X size={12}/></button>
                                </div>
                              ))}
                              {editingPostNewImages.map((file, i) => (
                                <div key={`new-${i}`} className="relative group shrink-0">
                                  <img src={URL.createObjectURL(file)} alt="new attachment" className="h-16 w-16 rounded-md object-cover border border-dashed border-[#0052ff]" />
                                  <button onClick={() => setEditingPostNewImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"><X size={12}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <select
                                value={editingPostTag}
                                onChange={(e) => setEditingPostTag(e.target.value)}
                                className="rounded-md border border-[rgba(91,97,110,0.2)] bg-white px-3 py-1.5 text-xs text-[#0a0b0d] outline-none focus:border-[#0052ff]"
                              >
                                <option value="Update">Update</option>
                                <option value="Hiring">Hiring</option>
                                <option value="Collab">Collab</option>
                                <option value="Partnership">Partnership</option>
                              </select>
                              <label className="cursor-pointer text-xs font-semibold text-[#0052ff] hover:underline">
                                + Add Images
                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setEditingPostNewImages(prev => [...prev, ...Array.from(e.target.files || [])])} />
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingPostId(null)} disabled={isSavingPost} className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#5b616e] hover:bg-[#eef0f3] disabled:opacity-50">Cancel</button>
                              <button
                                disabled={isSavingPost}
                                onClick={async () => {
                                  setIsSavingPost(true);
                                  try {
                                    let finalAttachments = [...editingPostAttachments];
                                    if (editingPostNewImages.length > 0) {
                                      for (let i = 0; i < editingPostNewImages.length; i++) {
                                        const result = await uploadFile(editingPostNewImages[i], `post-img-${Date.now()}-${i}`, ['post']);
                                        finalAttachments.push(result.url);
                                      }
                                    }
                                    updatePost(post.id, { 
                                      content: editingPostContent, 
                                      tag: editingPostTag, 
                                      attachments: finalAttachments, 
                                      attachment: finalAttachments[0] || null, 
                                      attachmentType: finalAttachments.length > 0 ? 'image' : null 
                                    });
                                    setEditingPostId(null);
                                    refreshProfile();
                                  } catch (err) {
                                    console.error('Failed to save post:', err);
                                    alert('Failed to upload new images.');
                                  } finally {
                                    setIsSavingPost(false);
                                  }
                                }}
                                className="flex items-center gap-2 rounded-md bg-[#0052ff] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0046d8] disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isSavingPost ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                                {isSavingPost ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-sm bg-[#eef0f3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a0b0d]">{post.tag}</span>
                          </div>
                          <p className="mt-3 text-[14px] leading-[1.5] text-[#0a0b0d] whitespace-pre-wrap">{post.content}</p>
                          {(post.attachment || (post.attachments && post.attachments.length > 0)) && (
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                              {post.attachments && post.attachments.length > 0 ? (
                                post.attachments.map((url, i) => (
                                  <img key={i} src={url} alt="attachment" className="h-20 w-20 shrink-0 rounded-md object-cover border border-[#e2e8f0]" />
                                ))
                              ) : post.attachmentType === 'image' ? (
                                <img src={post.attachment} alt="attachment" className="h-20 w-20 shrink-0 rounded-md object-cover border border-[#e2e8f0]" />
                              ) : (
                                <a href={post.attachment} target="_blank" rel="noreferrer" className="text-xs text-[#0052ff]">View File</a>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-[#5b616e]">
                        <span className="flex items-center gap-1.5"><Heart size={14} /> {post.likes || 0}</span>
                        <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {post.comments?.length || 0}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

          </div>

          <div className="space-y-5 lg:sticky lg:top-6">
            <section className="rounded-sm border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
              <h3 className="text-[20px] font-semibold text-[#0F172A]">Trust Proofs</h3>
              <div className="mt-4 space-y-3">
                {proofItems.map((item) => (
                  <div key={item.text} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#10B981]" />
                      <span className="text-sm font-medium text-[#0F172A]">{item.text}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">{item.level}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsAIChatOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-[rgba(0,82,255,0.12)] bg-[#0052ff]/5 px-4 py-3 text-sm font-semibold text-[#0052ff] shadow-[0_4px_6px_-1px_rgba(0,0,255,0.05)] transition-all hover:bg-[#0052ff]/10"
              >
                <Sparkles size={15} /> Ask AI Optimizer
              </button>
              <button
                type="button"
                onClick={handleEditStart}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-[#0066FF] bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]"
              >
                <Pencil size={15} /> Edit Profile
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]"
              >
                <CircleDashed size={15} /> View Wallet
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]"
              >
                <Shield size={15} /> Security Settings
              </button>
            </div>

            <section className="rounded-sm border border-[#0F172A] bg-[#0F172A] p-5 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2)]">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-white/70">Protocol Insight</p>
              <p className="mt-3 text-sm leading-6 text-white/85">
                {profileInfo.name} profile is currently ranked in top trust percentile for escrow reliability and identity continuity.
              </p>
              <button type="button" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#93C5FD]">
                View full ranking <ChevronRight size={14} />
              </button>
            </section>
          </div>
        </div>

      </div>

      {isEditing ? (
        <EditProfileModal
          mode={editMode}
          draftInfo={draftInfo}
          onFieldChange={handleFieldChange}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      ) : null}
      <ProfileAIChat 
        profileData={profileInfo}
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />
    </div>
  );
}

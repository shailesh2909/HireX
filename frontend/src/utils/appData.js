import { getUser } from './flowState';

const STORAGE_KEY = 'syncup.appData';

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentUserName() {
  const user = getUser();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return user?.name || fullName || 'Verified User';
}

function currentUserEmail() {
  const user = getUser();
  return String(user?.email || '').trim();
}

function currentUserMobile() {
  const user = getUser();
  return String(user?.mobileNumber || user?.mobile || '').trim();
}

function currentUserRole() {
  const user = getUser();
  return user?.role === 'business' ? 'business' : 'individual';
}

function sanitizePost(post, index = 0) {
  return {
    id: post?.id || uid(`post-fallback-${index}`),
    author: post?.author || 'Verified User',
    authorRole: post?.authorRole || 'Verified Professional',
    content: post?.content || '',
    tag: post?.tag || 'Update',
    likes: Number.isFinite(post?.likes) ? post.likes : 0,
    comments: Array.isArray(post?.comments) ? post.comments : [],
    createdAt: post?.createdAt || nowIso(),
    likedByMe: Boolean(post?.likedByMe),
    imagesCount: Number.isFinite(post?.imagesCount) ? post.imagesCount : 0,
    attachment: post?.attachment || null,
    attachments: Array.isArray(post?.attachments) ? post.attachments : (post?.attachment ? [post.attachment] : []),
    attachmentType: post?.attachmentType || null,
    authorPhoto: post?.authorPhoto || null,
  };
}

function sanitizeOpportunity(item, index = 0) {
  return {
    id: item?.id || uid(`opp-fallback-${index}`),
    title: item?.title || 'Untitled opportunity',
    company: item?.company || 'Verified Company',
    mode: item?.mode || 'Remote',
    tag: item?.tag || 'Hiring',
    description: item?.description || '',
    createdBy: item?.createdBy || 'system',
    savedByMe: Boolean(item?.savedByMe),
    appliedByMe: Boolean(item?.appliedByMe),
    createdAt: item?.createdAt || nowIso(),
  };
}

function defaultData() {
  return {
    profile: {
      name: currentUserName(),
      firstName: '',
      lastName: '',
      email: currentUserEmail(),
      mobile: currentUserMobile(),
      additionalName: '',
      pronouns: '',
      headline: '',
      currentPosition: '',
      industry: '',
      educations: [],
      education: '',
      languages: ['English (Native)'],
      links: [],
      resume: null,
      country: 'India',
      state: '',
      city: '',
      postalCode: '',
      showCurrentPosition: true,
      showEducation: true,
      about: "",
      skills: '',
      openTo: 'Projects, hiring conversations, and partnerships',
      postsCount: 0,
      connectionsCount: 0,
      chatsCount: 0,
      completion: 0,
      updatedAt: nowIso(),
    },
    posts: [
      {
        id: 'post-1',
        author: 'Ananya Singh',
        authorRole: 'Founder at BuildLoop',
        content: 'Looking for a verified frontend engineer with React + performance optimization experience.',
        tag: 'Hiring',
        likes: 18,
        comments: [
          { id: 'c-1', author: 'Rahul', text: 'Shared your role with my network.', createdAt: nowIso() },
        ],
        createdAt: nowIso(),
        likedByMe: false,
      },
      {
        id: 'post-2',
        author: 'Nexa Systems',
        authorRole: 'Verified Business',
        content: 'Opening integration partnerships with analytics and CRM startups.',
        tag: 'Partnership',
        likes: 9,
        comments: [],
        createdAt: nowIso(),
        likedByMe: false,
      },
      {
        id: 'post-3',
        author: 'Rahul Mehta',
        authorRole: 'Product Consultant',
        content: 'Sharing my framework for reducing onboarding drop-offs by 28%.',
        tag: 'Collab',
        likes: 14,
        comments: [],
        createdAt: nowIso(),
        likedByMe: true,
      },
    ],
    opportunities: [
      {
        id: 'opp-1',
        title: 'Frontend Engineer',
        company: 'OrbitPay',
        mode: 'Remote',
        tag: 'Hiring',
        description: 'Build high-performance onboarding flows in React.',
        createdBy: 'OrbitPay',
        savedByMe: false,
        appliedByMe: false,
        createdAt: nowIso(),
      },
      {
        id: 'opp-2',
        title: 'Product Growth Consultant',
        company: 'ScaleGrid',
        mode: 'Bengaluru',
        tag: 'Consulting',
        description: 'Lead activation and retention experiments for B2B SaaS teams.',
        createdBy: 'ScaleGrid',
        savedByMe: true,
        appliedByMe: false,
        createdAt: nowIso(),
      },
    ],
    network: {
      discover: [
        {
          id: 'n-1',
          name: 'Riya Arora',
          role: 'Senior Product Designer',
          company: 'BuildLoop',
          note: 'Open to design consulting and UX audits.',
          connected: false,
        },
        {
          id: 'n-2',
          name: 'Karan Shah',
          role: 'Growth Marketer',
          company: 'ScaleGrid',
          note: 'Works on lifecycle automation and conversion growth.',
          connected: false,
        },
      ],
      my: [
        {
          id: 'n-3',
          name: 'Rahul Mehta',
          role: 'Product Consultant',
          company: 'Independent',
          note: 'Connected for growth playbooks and product strategy.',
          connected: true,
        },
      ],
    },
    events: [
      {
        id: 'event-1',
        title: 'Founder x Engineer Matchday',
        description: 'Curated speed networking for founders and senior engineers.',
        eventDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        venue: 'Mumbai',
        ticketPrice: 499,
        capacity: 120,
        attending: false,
        attendees: 42,
        status: 'Open',
      },
    ],
    messages: {
      threads: [
        {
          id: 't-1',
          name: 'Ananya Singh',
          role: 'Founder • BuildLoop',
          unread: true,
          archived: false,
          messages: [
            { id: 'm-1', fromMe: false, text: 'Can you share your portfolio?', createdAt: nowIso() },
            { id: 'm-2', fromMe: true, text: 'Yes, sharing it today.', createdAt: nowIso() },
          ],
        },
      ],
      activeThreadId: 't-1',
    },
    notifications: [
      {
        id: 'not-1',
        title: 'Welcome to your dynamic dashboard',
        desc: 'All modules are now connected with persistent state.',
        time: nowIso(),
        read: false,
      },
    ],
    discover: [
      { id: 'd-1', name: 'OrbitPay', title: 'Verified Business', tag: 'Company', detail: 'Hiring product and frontend talent.' },
      { id: 'd-2', name: 'Aman Verma', title: 'Founder', tag: 'People', detail: 'Open to advisory and partnerships.' },
    ],
    referral: {
      wallet: 0,
      couponsUsed: [],
      claimedMilestones: [],
    },
    settings: {
      profileVisibility: true,
      messageRequests: true,
      opportunityAlerts: true,
      digestEmails: false,
    },
  };
}

function hydrateProfileFromVerifiedUser(profile = {}) {
  const user = getUser() || {};
  const firstName = String(profile.firstName || user.firstName || '').trim();
  const lastName = String(profile.lastName || user.lastName || '').trim();
  const nameFromParts = [firstName, lastName].filter(Boolean).join(' ').trim();
  const rawProfileName = String(profile.name || '').trim();
  const normalizedProfileName = rawProfileName.toLowerCase() === 'verified user' ? '' : rawProfileName;
  const name = String(normalizedProfileName || user.name || nameFromParts || 'Verified User').trim();
  const email = String(profile.email || user.email || '').trim();
  const mobile = String(profile.mobile || profile.mobileNumber || user.mobileNumber || user.mobile || '').trim();

  return {
    ...profile,
    firstName,
    lastName,
    name,
    email,
    mobile,
    links: Array.isArray(profile.links) ? profile.links : [],
  };
}

function readData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = defaultData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw);
    
    // Safety check: If the stored profile email doesn't match current user, reset
    const currentEmail = currentUserEmail();
    if (parsed.profile?.email && currentEmail && parsed.profile.email !== currentEmail) {
      const initial = defaultData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const merged = {
      ...defaultData(),
      ...parsed,
      profile: {
        ...defaultData().profile,
        ...(parsed.profile || {}),
      },
      network: {
        ...defaultData().network,
        ...(parsed.network || {}),
      },
      messages: {
        ...defaultData().messages,
        ...(parsed.messages || {}),
      },
      referral: {
        ...defaultData().referral,
        ...(parsed.referral || {}),
      },
      settings: {
        ...defaultData().settings,
        ...(parsed.settings || {}),
      },
    };

    return {
      ...merged,
      posts: Array.isArray(merged.posts)
        ? merged.posts.map((post, index) => sanitizePost(post, index))
        : defaultData().posts,
      opportunities: Array.isArray(merged.opportunities)
        ? merged.opportunities.map((item, index) => sanitizeOpportunity(item, index))
        : defaultData().opportunities,
    };
  } catch {
    const initial = defaultData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writeData(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function mutate(mutator) {
  const current = readData();
  const next = mutator(current);
  writeData(next);
  return next;
}

export function getAppData() {
  return readData();
}

export function getProfile() {
  const state = readData();
  return hydrateProfileFromVerifiedUser(state.profile);
}

export function updateProfile(patch) {
  const next = mutate((state) => ({
    ...state,
    profile: {
      ...state.profile,
      ...patch,
      updatedAt: nowIso(),
    },
  }));
  return next.profile;
}

export function getRecommendedFeed() {
  const state = readData();
  const role = currentUserRole();
  const preferredTag = role === 'business' ? 'Partnership' : 'Hiring';
  return [...state.posts].map((post, index) => sanitizePost(post, index)).sort((a, b) => {
    const scoreA = (a.tag === preferredTag ? 2 : 0) + a.likes + a.comments.length;
    const scoreB = (b.tag === preferredTag ? 2 : 0) + b.likes + b.comments.length;
    return scoreB - scoreA;
  });
}

export function createPost({ content, imagesCount = 0, tag = 'Update', attachment = null, attachments = [], attachmentType = null }) {
  const user = getUser();
  const profile = getProfile();
  const author = user?.name || 'Verified User';
  const authorRole = user?.role === 'business' ? 'Verified Business' : 'Verified Professional';
  
  // ensure backward compatibility for local state logic
  const resolvedAttachments = attachments.length > 0 ? attachments : (attachment ? [attachment] : []);
  
  const post = {
    id: uid('post'),
    author,
    authorRole,
    authorPhoto: profile?.photoUrl || null,
    content,
    tag,
    likes: 0,
    comments: [],
    createdAt: nowIso(),
    likedByMe: false,
    imagesCount,
    attachment: resolvedAttachments[0] || null,
    attachments: resolvedAttachments,
    attachmentType,
  };

  mutate((state) => ({
    ...state,
    posts: [post, ...state.posts],
    profile: {
      ...state.profile,
      postsCount: (state.profile.postsCount || 0) + 1,
    },
    notifications: [
      {
        id: uid('not'),
        title: 'Post published',
        desc: 'Your post is now live in the recommended feed.',
        time: nowIso(),
        read: false,
      },
      ...state.notifications,
    ],
  }));

  return post;
}

export function getMyPosts() {
  const state = readData();
  const authorName = currentUserName();
  return state.posts
    .filter((post) => post.author === authorName)
    .map((post, index) => sanitizePost(post, index))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function deletePost(postId) {
  mutate((state) => {
    const updatedPosts = state.posts.filter((post) => post.id !== postId);
    return {
      ...state,
      posts: updatedPosts,
      profile: {
        ...state.profile,
        postsCount: Math.max(0, (state.profile.postsCount || 0) - 1),
      },
    };
  });
}

export function updatePost(postId, updates) {
  let updatedPost = null;
  mutate((state) => {
    const posts = state.posts.map((post) => {
      if (post.id === postId) {
        updatedPost = { ...post, ...updates };
        return updatedPost;
      }
      return post;
    });
    return { ...state, posts };
  });
  return updatedPost;
}

export function toggleLikePost(postId) {
  let updatedPost = null;
  mutate((state) => {
    const posts = state.posts.map((post) => {
      if (post.id !== postId) {
        return post;
      }

      const likedByMe = !post.likedByMe;
      updatedPost = {
        ...post,
        likedByMe,
        likes: likedByMe ? post.likes + 1 : Math.max(0, post.likes - 1),
      };
      return updatedPost;
    });

    return {
      ...state,
      posts,
    };
  });
  return updatedPost;
}

export function addCommentToPost(postId, text) {
  if (!text.trim()) {
    return null;
  }

  let updatedPost = null;
  mutate((state) => {
    const posts = state.posts.map((post) => {
      if (post.id !== postId) {
        return post;
      }

      updatedPost = {
        ...post,
        comments: [
          ...post.comments,
          {
            id: uid('c'),
            author: currentUserName(),
            text: text.trim(),
            createdAt: nowIso(),
          },
        ],
      };
      return updatedPost;
    });

    return {
      ...state,
      posts,
    };
  });

  return updatedPost;
}

export function getOpportunities() {
  const state = readData();
  return state.opportunities.map((item, index) => sanitizeOpportunity(item, index));
}

export function createOpportunity(payload) {
  const nextItem = {
    id: uid('opp'),
    title: payload.title,
    company: payload.company || currentUserName(),
    mode: payload.mode || payload.location || 'Remote',
    tag: payload.tag || 'Hiring',
    description: payload.description,
    createdBy: currentUserName(),
    savedByMe: false,
    appliedByMe: false,
    createdAt: nowIso(),
  };

  mutate((state) => ({
    ...state,
    opportunities: [nextItem, ...state.opportunities],
    notifications: [
      {
        id: uid('not'),
        title: 'Opportunity published',
        desc: `${nextItem.title} is now visible to verified members.`,
        time: nowIso(),
        read: false,
      },
      ...state.notifications,
    ],
  }));

  return nextItem;
}

export function toggleSaveOpportunity(opportunityId) {
  return mutate((state) => ({
    ...state,
    opportunities: state.opportunities.map((item) => item.id === opportunityId
      ? { ...item, savedByMe: !item.savedByMe }
      : item),
  })).opportunities.find((item) => item.id === opportunityId);
}

export function applyOpportunity(opportunityId) {
  let updated;
  mutate((state) => {
    const opportunities = state.opportunities.map((item) => {
      if (item.id !== opportunityId) {
        return item;
      }
      updated = { ...item, appliedByMe: true };
      return updated;
    });

    return {
      ...state,
      opportunities,
      notifications: [
        {
          id: uid('not'),
          title: 'Application submitted',
          desc: updated ? `Applied for ${updated.title}.` : 'Application sent.',
          time: nowIso(),
          read: false,
        },
        ...state.notifications,
      ],
    };
  });
  return updated;
}

export function getNetworkData() {
  const network = readData().network || {};
  return {
    discover: Array.isArray(network.discover) ? network.discover : [],
    my: Array.isArray(network.my) ? network.my : [],
  };
}

export function connectPerson(personId) {
  mutate((state) => {
    const discover = state.network.discover.map((person) => (
      person.id === personId ? { ...person, connected: true } : person
    ));

    const person = discover.find((item) => item.id === personId);
    const already = state.network.my.some((item) => item.id === personId);
    const my = person && !already ? [{ ...person, connected: true }, ...state.network.my] : state.network.my;

    return {
      ...state,
      network: {
        discover,
        my,
      },
      profile: {
        ...state.profile,
        connectionsCount: my.length,
      },
    };
  });
}

export function addDiscoverToNetwork(discoverId) {
  let success = false;
  mutate((state) => {
    const discoverItem = state.discover.find((d) => d.id === discoverId);
    if (!discoverItem) return state;

    const already = state.network.my.some((item) => item.id === discoverId);
    if (already) {
      success = true; // Already added
      return state;
    }

    const newConnection = {
      id: discoverItem.id,
      name: discoverItem.name,
      role: discoverItem.title,
      company: discoverItem.tag.toLowerCase() === 'company' ? discoverItem.name : '',
      note: discoverItem.detail,
      connected: true,
      photoUrl: discoverItem.tag.toLowerCase() !== 'company' ? `https://i.pravatar.cc/150?u=${discoverItem.id}` : null,
    };

    const my = [newConnection, ...state.network.my];
    success = true;

    return {
      ...state,
      network: {
        ...state.network,
        my,
      },
      profile: {
        ...state.profile,
        connectionsCount: my.length,
      },
    };
  });
  return success;
}

export function removePersonFromNetwork(personId) {
  mutate((state) => {
    const my = state.network.my.filter((person) => person.id !== personId);
    const discoverHasPerson = state.network.discover.some((person) => person.id === personId);
    const removedPerson = state.network.my.find((person) => person.id === personId);
    const discover = discoverHasPerson
      ? state.network.discover.map((person) => (person.id === personId ? { ...person, connected: false } : person))
      : removedPerson
        ? [{ ...removedPerson, connected: false }, ...state.network.discover]
        : state.network.discover;

    return {
      ...state,
      network: {
        discover,
        my,
      },
      profile: {
        ...state.profile,
        connectionsCount: my.length,
      },
    };
  });
}

export function getEvents() {
  return readData().events;
}

export function createEvent(payload) {
  const event = {
    id: uid('event'),
    title: payload.title,
    description: payload.description,
    eventDate: payload.eventDate,
    venue: payload.venue,
    ticketPrice: Number(payload.ticketPrice) || 0,
    capacity: Number(payload.capacity) || 1,
    attending: false,
    attendees: 0,
    status: 'Open',
  };

  mutate((state) => ({
    ...state,
    events: [event, ...state.events],
  }));

  return event;
}

export function toggleAttendEvent(eventId) {
  return mutate((state) => ({
    ...state,
    events: state.events.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      const attending = !event.attending;
      return {
        ...event,
        attending,
        attendees: attending ? event.attendees + 1 : Math.max(0, event.attendees - 1),
      };
    }),
  })).events.find((event) => event.id === eventId);
}

export function searchDiscover(query) {
  const q = query.trim().toLowerCase();
  const base = readData().discover;
  if (!q) {
    return base;
  }
  return base.filter((item) => (
    item.name.toLowerCase().includes(q)
    || item.title.toLowerCase().includes(q)
    || item.detail.toLowerCase().includes(q)
    || item.tag.toLowerCase().includes(q)
  ));
}

export function getMessages() {
  return readData().messages;
}

export function setActiveThread(threadId) {
  mutate((state) => ({
    ...state,
    messages: {
      ...state.messages,
      activeThreadId: threadId,
      threads: state.messages.threads.map((thread) => thread.id === threadId
        ? { ...thread, unread: false }
        : thread),
    },
  }));
}

export function sendMessage(text) {
  if (!text.trim()) {
    return null;
  }

  let sent = null;
  mutate((state) => {
    const activeId = state.messages.activeThreadId;
    const threads = state.messages.threads.map((thread) => {
      if (thread.id !== activeId) {
        return thread;
      }

      sent = {
        id: uid('m'),
        fromMe: true,
        text: text.trim(),
        createdAt: nowIso(),
      };

      return {
        ...thread,
        messages: [...thread.messages, sent],
      };
    });

    return {
      ...state,
      messages: {
        ...state.messages,
        threads,
      },
    };
  });

  return sent;
}

export function createMessageThread({ name, role = 'Verified Member', introMessage }) {
  const safeName = (name || '').trim();
  if (!safeName) {
    return null;
  }

  const threadId = uid('t');
  const firstMessage = {
    id: uid('m'),
    fromMe: true,
    text: (introMessage || `Hi ${safeName}, nice to connect.`).trim(),
    createdAt: nowIso(),
  };

  mutate((state) => ({
    ...state,
    messages: {
      ...state.messages,
      activeThreadId: threadId,
      threads: [
        {
          id: threadId,
          name: safeName,
          role,
          unread: false,
          archived: false,
          messages: [firstMessage],
        },
        ...state.messages.threads,
      ],
    },
  }));

  return threadId;
}

export function archiveThread(threadId) {
  mutate((state) => ({
    ...state,
    messages: {
      ...state.messages,
      threads: state.messages.threads.map((thread) => thread.id === threadId
        ? { ...thread, archived: true }
        : thread),
      activeThreadId: state.messages.activeThreadId === threadId
        ? state.messages.threads.find((thread) => thread.id !== threadId)?.id || ''
        : state.messages.activeThreadId,
    },
  }));
}

export function getNotifications() {
  return readData().notifications;
}

export function markNotificationRead(notificationId) {
  mutate((state) => ({
    ...state,
    notifications: state.notifications.map((item) => item.id === notificationId
      ? { ...item, read: true }
      : item),
  }));
}

export function markAllNotificationsRead() {
  mutate((state) => ({
    ...state,
    notifications: state.notifications.map((item) => ({ ...item, read: true })),
  }));
}

export function getSettings() {
  return readData().settings;
}

export function updateSetting(key, value) {
  mutate((state) => ({
    ...state,
    settings: {
      ...state.settings,
      [key]: value,
    },
  }));
}

export function getReferralData() {
  return readData().referral;
}

export function redeemCoupon(code) {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { ok: false, message: 'Enter a valid coupon code.' };
  }

  const state = readData();
  if (state.referral.couponsUsed.includes(trimmed)) {
    return { ok: false, message: 'Coupon already used.' };
  }

  mutate((prev) => ({
    ...prev,
    referral: {
      ...prev.referral,
      wallet: prev.referral.wallet + 100,
      couponsUsed: [...prev.referral.couponsUsed, trimmed],
    },
  }));

  return { ok: true, message: 'Coupon redeemed. Rs 100 added to wallet.' };
}

export function claimReferralMilestone(tier, requiredReferrals) {
  const key = `tier-${tier}`;
  const state = readData();
  const totalReferrals = state.profile.connectionsCount;

  if (state.referral.claimedMilestones.includes(key)) {
    return { ok: false, message: `Tier ${tier} already claimed.` };
  }

  if (totalReferrals < requiredReferrals) {
    return { ok: false, message: `Need ${requiredReferrals} referrals to claim Tier ${tier}.` };
  }

  mutate((prev) => ({
    ...prev,
    referral: {
      ...prev.referral,
      wallet: prev.referral.wallet + tier * 250,
      claimedMilestones: [...prev.referral.claimedMilestones, key],
    },
  }));

  return { ok: true, message: `Tier ${tier} claimed successfully.` };
}

export function updateResume(resume) {
  mutate((state) => ({
    ...state,
    profile: {
      ...state.profile,
      resume,
      updatedAt: nowIso(),
    },
  }));
}

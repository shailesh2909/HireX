import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Archive, Search, Send, User } from 'lucide-react';
import { archiveThread, createMessageThread, getMessages, sendMessage, setActiveThread, getNetworkData } from '../utils/appData';
import DashboardNavbar from '../components/DashboardNavbar';

export default function Messages() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [draftMessage, setDraftMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef(null);

  const messageState = useMemo(() => getMessages(), [refreshKey]);
  const networkData = useMemo(() => getNetworkData(), [refreshKey]);
  
  // All non-archived threads
  const visibleThreads = messageState.threads.filter((thread) => !thread.archived);
  
  // Create a merged list of "Contacts/Threads" for the sidebar
  // 1. All existing visible threads
  // 2. Any connection from network.my that doesn't have an existing thread
  const sidebarItems = useMemo(() => {
    const items = [];
    const threadNames = new Set();
    
    // Add existing threads
    for (const thread of visibleThreads) {
      items.push({
        id: thread.id,
        isThread: true,
        name: thread.name,
        role: thread.role,
        unread: thread.unread,
        preview: thread.messages[thread.messages.length - 1]?.text || 'No messages yet',
        time: thread.messages[thread.messages.length - 1]?.createdAt 
          ? new Date(thread.messages[thread.messages.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        data: thread
      });
      threadNames.add(thread.name.toLowerCase());
    }
    
    // Add connections that don't have a thread
    for (const conn of networkData.my) {
      if (!threadNames.has(conn.name.toLowerCase())) {
        items.push({
          id: `conn-${conn.id}`,
          isThread: false,
          name: conn.name,
          role: conn.role || conn.company || 'Connection',
          unread: false,
          preview: 'Start a new conversation',
          time: '',
          data: conn
        });
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return items.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.role.toLowerCase().includes(q)
      );
    }
    
    return items;
  }, [visibleThreads, networkData.my, searchQuery]);

  const activeThread = visibleThreads.find((thread) => thread.id === messageState.activeThreadId) || null;
  // If no active thread, but user clicked a connection, we store it in a temporary state until a message is sent
  const [activeNewContact, setActiveNewContact] = useState(null);

  const location = useLocation();
  const [hasInitializedState, setHasInitializedState] = useState(false);

  // Handle incoming routing state (e.g. from Network page "Message" button)
  useEffect(() => {
    if (location.state?.openContactId && sidebarItems.length > 0 && !hasInitializedState) {
      const contactId = location.state.openContactId;
      const contactName = networkData.my.find((c) => c.id === contactId)?.name;
      
      const existingThreadItem = sidebarItems.find(
        (item) => item.isThread && contactName && item.name.toLowerCase() === contactName.toLowerCase()
      );
      const newContactItem = sidebarItems.find((item) => item.id === `conn-${contactId}`);

      if (existingThreadItem) {
        handleSelectItem(existingThreadItem);
      } else if (newContactItem) {
        handleSelectItem(newContactItem);
      }
      setHasInitializedState(true);
    }
  }, [location.state, sidebarItems, hasInitializedState, networkData.my]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages?.length]);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function handleSelectItem(item) {
    if (item.isThread) {
      setActiveThread(item.id);
      setActiveNewContact(null);
    } else {
      setActiveThread(null); // Clear active thread
      setActiveNewContact(item.data); // Set the new contact
    }
    refresh();
  }

  function handleArchiveThread(threadId, e) {
    e.stopPropagation();
    archiveThread(threadId);
    if (messageState.activeThreadId === threadId) {
      setActiveThread(null);
    }
    refresh();
  }

  function handleSendMessage() {
    if (!draftMessage.trim()) return;

    if (!activeThread && activeNewContact) {
      // Create new thread for the connection
      const createdThreadId = createMessageThread({
        name: activeNewContact.name,
        role: activeNewContact.role || activeNewContact.company || 'Verified Member',
        introMessage: draftMessage,
      });
      if (createdThreadId) {
        setDraftMessage('');
        setActiveNewContact(null);
        refresh();
      }
      return;
    }

    if (activeThread) {
      sendMessage(draftMessage);
      setDraftMessage('');
      refresh();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  // Determine current chat header info
  const chatHeaderName = activeThread ? activeThread.name : (activeNewContact ? activeNewContact.name : 'No active conversation');
  const chatHeaderRole = activeThread ? activeThread.role : (activeNewContact ? (activeNewContact.role || activeNewContact.company) : 'Select a connection to start chatting');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1240px] space-y-6">
        <DashboardNavbar activePath="/messages" />

        <header className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Messages</p>
          <h1 className="mt-2 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">Verified conversations</h1>
          <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Connect securely with your network. No noise, no spam, just accountable communication.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr] h-[calc(100vh-280px)] min-h-[500px]">
          
          {/* Sidebar */}
          <aside className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
            <div className="p-4 border-b border-[rgba(91,97,110,0.1)] bg-[#fafbfd]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b616e]" />
                <input
                  type="text"
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[rgba(91,97,110,0.2)] bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff]"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {sidebarItems.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#5b616e]">
                  No connections found.
                </div>
              ) : (
                <div className="divide-y divide-[rgba(91,97,110,0.08)]">
                  {sidebarItems.map((item) => {
                    const isActive = (activeThread && activeThread.id === item.id) || (activeNewContact && `conn-${activeNewContact.id}` === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`group cursor-pointer p-4 transition-all hover:bg-[#f5f7fb] ${isActive ? 'bg-[#f5f7fb] border-l-4 border-l-[#0052ff]' : 'border-l-4 border-l-transparent'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf0ff] text-[#0052ff] font-semibold">
                              {item.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className={`truncate text-sm ${item.unread ? 'font-bold text-[#0a0b0d]' : 'font-semibold text-[#0a0b0d]'}`}>
                                {item.name}
                              </p>
                              <p className="truncate text-xs text-[#5b616e]">{item.role}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {item.time && <span className="text-[10px] text-[#5b616e]">{item.time}</span>}
                            {item.isThread && (
                              <button 
                                onClick={(e) => handleArchiveThread(item.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#5b616e] hover:text-[#0052ff]"
                                title="Archive thread"
                              >
                                <Archive size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={`mt-2 truncate text-xs ${item.unread ? 'font-medium text-[#0a0b0d]' : 'text-[#5b616e]'}`}>
                          {item.preview}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Main Chat Area */}
          <main className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
            <header className="flex items-center justify-between border-b border-[rgba(91,97,110,0.1)] bg-[#fafbfd] px-6 py-4">
              <div className="flex items-center gap-4">
                {(activeThread || activeNewContact) ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0052ff] text-white font-semibold">
                    {chatHeaderName.charAt(0)}
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <User size={20} />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-semibold text-[#0a0b0d]">{chatHeaderName}</h2>
                  <p className="text-xs text-[#5b616e]">{chatHeaderRole}</p>
                </div>
              </div>
              {(activeThread || activeNewContact) && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Online
                </span>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-6 bg-[#f8f9fc]">
              {activeThread ? (
                <div className="space-y-6">
                  {activeThread.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-4 text-[15px] leading-[1.5] shadow-sm ${
                        message.fromMe 
                          ? 'rounded-tr-sm bg-[#0052ff] text-white' 
                          : 'rounded-tl-sm border border-[rgba(91,97,110,0.1)] bg-white text-[#0a0b0d]'
                      }`}>
                        <p>{message.text}</p>
                        <p className={`mt-1 text-[10px] text-right ${message.fromMe ? 'text-white/70' : 'text-[#5b616e]'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : activeNewContact ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf0ff] text-[#0052ff] text-2xl font-bold mb-4">
                    {activeNewContact.name.charAt(0)}
                  </div>
                  <h3 className="text-lg font-semibold text-[#0a0b0d]">Start a conversation with {activeNewContact.name}</h3>
                  <p className="mt-2 max-w-sm text-sm text-[#5b616e]">
                    Send a message to begin your verified chat. Your messages are end-to-end secure.
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
                    <User size={32} className="text-[#5b616e]/40" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0a0b0d]">Select a connection</h3>
                  <p className="mt-2 max-w-sm text-sm text-[#5b616e]">
                    Choose a conversation from the left menu or search for a connection to start chatting.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-[rgba(91,97,110,0.1)] bg-white p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!activeThread && !activeNewContact}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-[rgba(91,97,110,0.2)] bg-[#f8f9fc] px-5 py-3 text-sm outline-none transition-all focus:border-[#0052ff] focus:bg-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!draftMessage.trim() || (!activeThread && !activeNewContact)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0052ff] text-white transition-all hover:bg-[#0046d8] disabled:opacity-50 disabled:hover:bg-[#0052ff]"
                >
                  <Send size={18} className="mr-0.5 mt-0.5" />
                </button>
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}

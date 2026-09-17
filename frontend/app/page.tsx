"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fraunces } from "next/font/google";
import Image from "next/image";
import { getToken, isLoggedIn, clearToken } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ tool: string; data: any }>;
  options?: string[];  // <-- NEW
};

type Session = {
  id: string;
  created_at: string;
  preview: string;
  title?: string;
  pinned: boolean;
};

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [emailModalData, setEmailModalData] = useState<{ to: string; subject: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // new state for context menu and rename
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  // new state for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    }
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadSessions = async () => {
    setSidebarLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load sessions");
      const data: Session[] = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSidebarLoading(false);
    }
  };

  const loadSessionMessages = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${id}/messages`, {
        method: "GET",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load messages");
      const data: ChatMessage[] = await res.json();
      setMessages(data);
      setSessionId(id);
      scrollToBottom();
      // close sidebar on mobile
      setSidebarOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId("");
    // close sidebar on mobile
    setSidebarOpen(false);
  };

const handleSend = async (overrideMessage?: string) => {
     const messageToSend = overrideMessage ?? input;
     if (!messageToSend.trim() || loading) return;

     const userMessage: ChatMessage = { role: "user", content: messageToSend };
     setMessages((prev) => [...prev, userMessage]);
     // Only clear input if we used the normal input (not override)
     if (!overrideMessage) setInput("");
     setLoading(true);
     setError(null);

     try {
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${getToken()}`,
         },
         body: JSON.stringify({
           message: userMessage.content,
           session_id: sessionId || undefined,
         }),
       });

       if (res.status === 401) {
         clearToken();
         router.push("/login");
         return;
       }

       if (!res.ok) throw new Error("Something went wrong reaching the planner.");

       const data = await res.json();
       const assistantMessage: ChatMessage = {
         role: "assistant",
         content: data.reply,
         toolCalls: data.tool_calls || [],
         options: data.options,  // <-- NEW
       };
       setMessages((prev) => [...prev, assistantMessage]);
       if (data.session_id) setSessionId(data.session_id);

       const emailCall = (data.tool_calls || []).find((tc: any) => tc.tool === "email");
       if (emailCall) {
         setEmailModalData({ to: emailCall.data.to, subject: emailCall.data.subject });
         setEmailModalOpen(true);
       }

       loadSessions();
     } catch (err) {
       setError(err instanceof Error ? err.message : "An unknown error occurred.");
     } finally {
       setLoading(false);
     }
   };

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const startRename = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(session.id);
    setRenameValue(session.title || session.preview);
    setOpenMenuId(null);
  };

  const confirmRename = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title: renameValue }),
      });
      if (res.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to rename");
    } catch (err) {
      console.error(err);
    } finally {
      setRenamingId(null);
      await loadSessions();
    }
  };

  const togglePin = async (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${session.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ pinned: !session.pinned }),
      });
      if (res.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to toggle pin");
    } catch (err) {
      console.error(err);
    } finally {
      setOpenMenuId(null);
      await loadSessions();
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (res.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err) {
      console.error(err);
    } finally {
      setOpenMenuId(null);
      if (id === sessionId) {
        startNewChat();
      }
      await loadSessions();
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // close menu when clicking outside
  const handleClickOutside = () => {
    setOpenMenuId(null);
  };

  return (
    <div className="flex-1 h-dvh flex bg-[#F7F3EC] overflow-hidden" onClick={handleClickOutside}>
      {/* Hamburger menu button (mobile only) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-30 md:hidden bg-[#1B3A4B] text-white rounded-lg p-2 shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      {/* Backdrop overlay (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
className={`
           fixed inset-y-0 left-0 z-40 w-64
           ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
           transform transition-transform duration-200
           bg-[#1B3A4B] text-white flex flex-col h-dvh min-h-0
           md:relative md:translate-x-0
         `}
      >
        <div className="flex items-center gap-2 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-1 .1-1.3.5l-.7.7c-.6.6-.5 1.6.3 2l5.9 2.5L6 15H2l-1 1 3 2 2 3 1-1v-4l3.5-3.5 2.5 5.9c.4.8 1.4.9 2 .3l.7-.7c.4-.3.6-.8.5-1.3z" />
            </svg>
          </div>
          <h1 className={`${fraunces.className} text-xl font-bold`}>Travel Planner</h1>
        </div>

        <button
          onClick={startNewChat}
          className="mx-4 my-2 flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 hover:bg-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>

        <div className="flex-1 overflow-y-auto">
          {sidebarLoading ? (
            <p className="px-4 py-2 text-center text-white/60">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="px-4 py-2 text-center text-white/60">No sessions yet.</p>
          ) : (
            sessions.map((session) => {
              const active = session.id === sessionId;
              return (
                <div
                  key={session.id}
                  className="group relative cursor-pointer border-b border-white/10 px-3 py-3 hover:bg-white/10"
                  onClick={() => loadSessionMessages(session.id)}
                >
                  {/* three dot button */}
<button
                     className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 rounded"
                     onClick={(e) => toggleMenu(session.id, e)}
                   >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>

                  {/* dropdown menu */}
                  {openMenuId === session.id && (
                    <div className="absolute right-2 top-8 bg-white rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-[#1B3A4B] hover:bg-[#F7F3EC]"
                        onClick={(e) => startRename(session, e)}
                      >
                        Rename
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-[#1B3A4B] hover:bg-[#F7F3EC]"
                        onClick={(e) => togglePin(session, e)}
                      >
                        {session.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-[#F7F3EC]"
                        onClick={(e) => deleteSession(session.id, e)}
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {/* session content */}
                  <div className="flex items-center gap-2 pl-8 pr-10">
                    {session.pinned && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                        <path d="M12 22l4-9v-5H4v5l4 9Z" />
                        <path d="M12 8v8" />
                      </svg>
                    )}
                    {renamingId === session.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(session.id);
                        }}
                        onBlur={() => confirmRename(session.id)}
                        autoFocus
                        className="small bg-white/10 text-white rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      <div className="truncate font-medium leading-tight">
                        {session.title || session.preview}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-white/60 pl-8">
                    {new Date(session.created_at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/25" />
                  )}
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center border-t border-white/10 px-4 py-3 hover:bg-white/20"
        >
          Log out
        </button>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-16 md:pt-0 min-h-0 relative`}
        >
          <div className="max-w-content mx-auto w-full">
            {messages.length === 0 && (
              <p className="text-center text-sm text-[#4A7C82]">
                Ask about weather, flights, or hotels for your next trip.
              </p>
            )}

            {messages.map((msg, idx) => (
              <React.Fragment key={idx}>
                {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-1 mr-auto flex max-w-[85%] sm:max-w-[75%] flex-wrap gap-2">
                    {msg.toolCalls.map((tc, tcIdx) => {
                      const labelMap: Record<string, string> = {
                        weather: "Checked weather",
                        flights: "Searched flights",
                        hotels: "Searched hotels",
                        preferences: "Checked preferences",
                      };
                      const label = labelMap[tc.tool] || tc.tool;
                      return (
                        <span
                          key={tcIdx}
                          className="inline-flex items-center gap-1 rounded-full bg-[#F7F3EC] px-3 py-1 text-xs text-[#4A7C82]"
                        >
                          &#10003; {label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div
                  className={
                    msg.role === "user"
                      ? "ml-auto max-w-[85%] sm:max-w-[75%] rounded-2xl bg-[#1B3A4B] px-4 py-3 text-white shadow-sm"
                      : "mr-auto max-w-[85%] sm:max-w-[75%] rounded-2xl border border-[#E0DCCC] bg-white px-4 py-3 text-[#1B3A4B] shadow-sm"
                  }
                >
{msg.role === "user" ? (
                     msg.content
                   ) : (
                     <div className="space-y-2">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                     </div>
                   )}
                   {/* OPTION BUTTONS */}
                   {msg.options && msg.options.length > 0 && (
                     <div className="flex flex-wrap gap-2 mt-3">
                       {msg.options.map((opt, optIdx) => (
<button
                             key={optIdx}
                             onClick={() => handleSend(opt)}
                             className="flex items-center justify-center rounded-full border border-[#E0DCCC] bg-[#F7F3EC] px-3 py-2 text-sm text-[#1B3A4B] hover:bg-[#E0DCCC] transition-colors"
                           >
                             {opt}
                           </button>
                       ))}
                     </div>
                   )}
                </div>
              </React.Fragment>
            ))}

            {loading && (
              <div className="mr-auto max-w-[85%] sm:max-w-[75%] rounded-2xl border border-[#E0DCCC] bg-white px-4 py-3 text-[#4A7C82]">
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}

            {error && (
              <div className="mr-auto max-w-[85%] sm:max-w-[75%] rounded-2xl border border-[#E8641C] bg-[#FFF4F0] px-4 py-3 text-[#E8641C]">
                {error}
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <footer className="border-t border-[#E0DCCC] bg-white px-3 py-3 sm:px-4 sm:py-4 flex-shrink-0">
          <div className="flex items-center gap-2 shadow-sm">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask me about your trip..."
              disabled={loading}
              suppressHydrationWarning={true}
              className="flex-1 rounded-full border border-[#E0DCCC] bg-[#F7F3EC] px-5 py-3 text-[15px] text-[#1B3A4B] outline-none focus:ring-2 focus:ring-[#E8641C]"
            />
            <button
            onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8641C] text-white transition-opacity disabled:opacity-40"
            >
              &#8594;
            </button>
          </div>

          <hr className="w-full border-t border-[#E0DCCC]" />

<div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#4A7C82]">
             <div className="relative h-10 w-10 sm:h-14 sm:w-14 shrink-0">
               <Image
                 src="/profile.jpg"
                 fill
                 alt="Profile"
                 className="rounded-full border-2 border-[#1B3A4B]/20 object-cover"
               />
             </div>
            <span className="font-bold">Built by Syed Salman Ali</span>
            <a href="https://github.com/sa8385123-creator" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B3A4B]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.01 1.65 5 4.77 5 4.77 5 4.77a5.44 5.44 0 0 0-1.71 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/syed-salman-ali-281a873a7" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B3A4B]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            <a href="https://www.tiktok.com/@syedsalmanali415" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B3A4B]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.35 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
          </div>
        </footer>
      </main>

      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEmailModalOpen(false)}>
          <div className="relative rounded-2xl p-8 max-w-sm shadow-xl text-center bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="bg-green-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className={`${fraunces.className} text-xl text-[#1B3A4B] mt-2`}>Email Sent!</h2>
            <p className="text-sm text-[#4A7C82] mt-2">
              Your trip details have been sent to <span className="font-medium">{emailModalData?.to ?? ""}</span>
            </p>
            {emailModalData && (
              <span className="bg-[#F7F3EC] text-[#1B3A4B] text-xs px-3 py-1.5 rounded-full mt-3 inline-block">
                {emailModalData.subject}
              </span>
            )}
            <button
              onClick={() => setEmailModalOpen(false)}
              className="bg-[#1B3A4B] text-white rounded-xl px-6 py-2.5 mt-6 font-medium hover:bg-[#162e3c]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// deploy trigger 09/16/2026 06:35:27

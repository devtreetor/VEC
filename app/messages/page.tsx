"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, Thread, Message } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Send, MessageSquare, ArrowLeft } from "lucide-react"
import { formatRelativeTime, getInitials, cn } from "@/lib/utils"

export default function MessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/auth"); return }

      const { data: dbUser } = await supabase.from("users").select("*").eq("id", session.user.id).single()
      setUser(dbUser as User)

      const res = await fetch("/api/threads")
      const data = await res.json()
      setThreads(data.threads || [])

      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!activeThread) return

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/threads/${activeThread.id}/messages`)
        if (!res.ok) return
        const data = await res.json()
        setMessages(data.messages || [])
      } catch (err) {
        console.error("Failed to load messages:", err)
      }
    }
    loadMessages()

    const channel = supabase
      .channel(`messages:${activeThread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${activeThread.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const selectThread = useCallback((thread: Thread) => {
    setActiveThread(thread)
    setMessages([])
  }, [])

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread || sending) return

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      thread_id: activeThread.id,
      sender_id: user!.id,
      body: newMessage,
      is_read: false,
      sent_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage("")
    setSending(true)

    const res = await fetch(`/api/threads/${activeThread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newMessage }),
    })

    if (res.ok) {
      const data = await res.json()
      setMessages((prev) => prev.map((m) => (m.id === optimisticMessage.id ? data.message : m)))
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
    }

    setSending(false)
  }

  const getOtherParticipant = (thread: Thread) => {
    if (!user) return null
    return thread.client_id === user.id ? thread.applicant : thread.client
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!user) return null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        <div className="md:col-span-1 border rounded-lg overflow-hidden">
          <div className="p-3 bg-muted/30">
            <h2 className="font-semibold">Threads</h2>
          </div>
          <div className="overflow-y-auto h-[calc(100%-3rem)]">
            {threads.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm p-4">No conversations yet.</p>
            ) : (
              threads.map((thread) => {
                const other = getOtherParticipant(thread)
                const isActive = activeThread?.id === thread.id
                return (
                  <button
                    key={thread.id}
                    onClick={() => selectThread(thread)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted/50 transition-colors border-b",
                      isActive && "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={other?.avatar_url || ""} />
                        <AvatarFallback>{getInitials(other?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{other?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {thread.gig?.title || "Gig"}
                        </p>
                      </div>
                      {thread.last_message_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelativeTime(thread.last_message_at)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="md:col-span-2 border rounded-lg flex flex-col">
          {activeThread ? (
            <>
              <div className="p-3 border-b bg-muted/30 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveThread(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getOtherParticipant(activeThread)?.avatar_url || ""} />
                  <AvatarFallback>{getInitials(getOtherParticipant(activeThread)?.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{getOtherParticipant(activeThread)?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{(activeThread as any).gig?.title}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user.id
                  return (
                    <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                          isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        <p>{msg.body}</p>
                        <p className={cn("text-xs mt-1", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {formatRelativeTime(msg.sent_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

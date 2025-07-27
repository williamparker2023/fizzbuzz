'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function MessagesPage() {
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    const loadMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUser(user)

      // Get all messages involving the current user
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id, sender_id, receiver_id, content, created_at,
          sender:sender_id (id, username, github_url),
          receiver:receiver_id (id, username, github_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

      if (error) {
        console.error(error)
        return
      }

      // Group messages by other user and get latest
      const latestMap = {}

      messages.forEach(msg => {
        const otherUser =
          msg.sender_id === user.id ? msg.receiver : msg.sender
        const key = otherUser.id

        if (!latestMap[key] || new Date(msg.created_at) > new Date(latestMap[key].created_at)) {
          latestMap[key] = {
            otherUser,
            content: msg.content,
            created_at: msg.created_at,
          }
        }
      })

      const sortedConversations = Object.values(latestMap).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )

      setConversations(sortedConversations)
    }

    loadMessages()
  }, [])

  return (
    <div className="w-full max-w-2xl px-4 py-6 text-black">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <p className="text-gray-500">You haven't messaged anyone yet.</p>
      ) : (
        conversations.map(conv => (
          <Link
            key={conv.otherUser.id}
            href={`/messages/${conv.otherUser.username}`}
            className="flex items-center gap-4 py-4 border-b border-gray-200 hover:bg-gray-50 transition"
          >
            <img
              src={conv.otherUser.github_url}
              alt="avatar"
              className="w-12 h-12 rounded-full border"
            />
            <div>
              <p className="font-semibold">@{conv.otherUser.username}</p>
              <p className="text-gray-500 text-sm truncate max-w-xs">
                {conv.content}
              </p>
            </div>
            <span className="ml-auto text-xs text-gray-400">
              {new Date(conv.created_at).toLocaleString()}
            </span>
          </Link>
        ))
      )}
    </div>
  )
}

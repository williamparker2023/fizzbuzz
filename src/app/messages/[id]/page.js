'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ConversationPage() {
  const { id: otherUsername } = useParams()
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [otherUserId, setOtherUserId] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error: userFetchError } = await supabase.auth.getUser()
      if (userFetchError || !user) return
      setCurrentUser(user)

      // Fetch other user (username → ID + username)
      const { data: otherUserData, error: otherUserError } = await supabase
        .from('users')
        .select('id, username, github_url')
        .eq('username', otherUsername)
        .single()

      if (otherUserError || !otherUserData) {
        console.error('Failed to find other user:', otherUserError)
        return
      }

      setOtherUserId(otherUserData.id)
      setOtherUser(otherUserData)

      // Load messages between currentUser and other user
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserData.id}),and(sender_id.eq.${otherUserData.id},receiver_id.eq.${user.id})`)
        .order('created_at')

      if (messageError) {
        console.error('Failed to load messages:', JSON.stringify(messageError, null, 2))
      } else {
        setMessages(messageData)
      }
    }

    load()
  }, [otherUsername])

    useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    }, [messages])


  const sendMessage = async (e) => {
    e.preventDefault()

    const content = messageText.trim()
    if (!content || !currentUser || !otherUserId) return

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      content,
    })

    if (error) {
      console.error("Failed to insert message:", JSON.stringify(error, null, 2))
    } else {
      setMessageText('')
      // Refresh messages
      const { data: newMessages, error: reloadError } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at')

      if (!reloadError) setMessages(newMessages)
      else console.error("Reload error:", reloadError)
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto text-black">
        <div className="flex items-center gap-4 mb-4">
        {otherUser?.github_url && (
            <img
            src={otherUser?.github_url}
            alt={`${otherUser?.username}'s avatar`}
            className="w-10 h-10 rounded-full object-cover"
            />
        )}
        <a
            href={`/profile/${otherUser?.username}`}
            className="text-lg font-semibold text-blue-600 hover:underline"
        >
            @{otherUser?.username || '...'}
        </a>
        </div>


      <div className="p-4 h-[60vh] overflow-y-scroll bg-white mb-4 scrollbar-hide">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`mb-2 p-2 rounded max-w-xs ${
              msg.sender_id === currentUser?.id
                ? 'bg-blue-100 ml-auto text-right'
                : 'bg-gray-200'
            }`}
          >
            <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>

            <p className="text-xs text-gray-500 mt-1">
              {new Date(msg.created_at).toLocaleTimeString()}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </main>
  )
}

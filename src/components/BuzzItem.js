'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function BuzzItem({ buzz, user, onLikeToggle, onCommentSubmit }) {
  const [open, setOpen] = useState(false)

  return (
    <div key={buzz.id} className="px-4 py-6 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <a href={`/user/${buzz.users?.username}`}>
          <img
            src={buzz.users?.github_url}
            alt="avatar"
            className="w-10 h-10 rounded-full border border-gray-300 hover:scale-105 transition"
          />
        </a>
        <a href={`/user/${buzz.users?.username}`} className="text-lg font-semibold hover:underline">
          {buzz.users?.username || 'unknown'}
        </a>
      </div>

      <p className="text-base text-black break-words whitespace-pre-wrap">{buzz.content}</p>

      {buzz.image_url && (
        <img
          src={buzz.image_url}
          alt="buzz image"
          className="w-full max-h-150 object-contain mt-4 rounded border border-gray-300"
        />
      )}

      {buzz.tags?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {buzz.tags.map((tag, i) => (
            <span key={i} className="border-gray-300 text-gray-500 px-2 py-1 rounded text-xs">#{tag}</span>
          ))}
        </div>
      )}

      <div className="flex gap-6 items-center text-sm text-gray-500 mt-2">
        <button onClick={() => onLikeToggle?.(buzz.id)} className="hover:scale-110 transition">
          {buzz.likedByUser ? '❤️' : '🤍'} {buzz.likeCount}
        </button>
        <button onClick={() => setOpen(prev => !prev)} className="hover:underline">
          💬 {buzz.comments.length}
        </button>
        <span className="text-xs">{new Date(buzz.created_at).toLocaleString()}</span>
      </div>

      {open && (
        <div className="pt-4 space-y-4 animate-fade-in">
          {user && (
            <form
              onSubmit={e => onCommentSubmit?.(e, buzz.id)}
              className="flex gap-2"
            >
              <input
                name="comment"
                placeholder="Reply..."
                className="flex-1 p-2 text-sm border border-gray-300 rounded text-black"
              />
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Send</button>
            </form>
          )}
          {buzz.comments.map(comment => (
            <div key={comment.id} className="text-sm text-black">
              <div className="flex items-center gap-2 mb-1">
                {comment.users?.username ? (
                  <a href={`/user/${comment.users.username}`} className="text-blue-600 hover:underline">
                    {comment.users.username}
                  </a>
                ) : <span className="text-gray-500">anonymous</span>}
                <span className="text-gray-500 text-xs">• {new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <div className="ml-1">💬 {comment.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

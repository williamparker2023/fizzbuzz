// app/new-buzz/page.js
'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewBuzz() {
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Not logged in')

    console.log("Current user ID:", user.id)

    // Insert buzz
    const { error } = await supabase.from('buzzes').insert({
      user_id: user.id,
      content,
      tags: tags.split(',').map(tag => tag.trim())
    })

    if (error) {
      console.error('INSERT ERROR:', error.message, error.details, error.hint)
      alert('Failed to post buzz')
    } else {
      router.push('/')
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create a Buzz 🐝</h1>
      <form onSubmit={handleSubmit} className="mb-8 text-blue-600 bg-opacity-10 p-4 rounded shadow animate-slideFade">
        <textarea
          className="p-3 border rounded"
          rows="4"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <input
          className="p-2 border rounded"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Post Buzz
        </button>
      </form>
    </main>
  )
}

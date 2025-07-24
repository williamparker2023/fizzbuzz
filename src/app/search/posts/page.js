'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import BuzzItem from '@/components/BuzzItem'

export default function PostSearchPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const query = searchParams.get('q')?.toLowerCase() || ''
  const [user, setUser] = useState(null)


    useEffect(() => {
    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (!query) return

        const { data, error } = await supabase
        .from('buzzes')
        .select(`
            id, content, created_at, image_url,
            users (username, github_url),
            likes:likes (user_id),
            comments (
            id, content, created_at, user_id,
            users (username, github_url)
            )
        `)
        .ilike('content', `%${query}%`)

        if (error) console.error(error)
        else {
        const transformed = data.map(buzz => {
            let likes = buzz.likes || []
            if (!Array.isArray(likes)) likes = [likes]

            return {
            ...buzz,
            likeCount: likes.length,
            likedByUser: user ? likes.some(like => like.user_id === user.id) : false
            }
        })

        setPosts(transformed)
        }

        setLoading(false)
    }

    fetchData()
    }, [query])


    const handleLikeToggle = async (buzzId) => {
    if (!user) return alert('Log in to like posts.')

    const post = posts.find(p => p.id === buzzId)
    const hasLiked = post.likedByUser

    if (hasLiked) {
        await supabase.from('likes').delete().eq('buzz_id', buzzId).eq('user_id', user.id)
    } else {
        await supabase.from('likes').insert({ buzz_id: buzzId, user_id: user.id })
    }

    // Refresh post data
    const { data, error } = await supabase
        .from('buzzes')
        .select(`
        id, content, created_at, image_url,
        users (username, github_url),
        likes:likes (user_id),
        comments (
            id, content, created_at, user_id,
            users (username, github_url)
        )
        `)
        .ilike('content', `%${query}%`)

    if (!error) {
        const transformed = data.map(buzz => {
        let likes = buzz.likes || []
        if (!Array.isArray(likes)) likes = [likes]

        return {
            ...buzz,
            likeCount: likes.length,
            likedByUser: user ? likes.some(like => like.user_id === user.id) : false
        }
        })

        setPosts(transformed)
    }
    }

    const handleCommentSubmit = async (e, buzzId) => {
    e.preventDefault()
    const content = e.target.comment.value
    if (!content.trim()) return

    const { data, error } = await supabase
        .from('comments')
        .insert({ content, buzz_id: buzzId, user_id: user.id })
        .select('id, content, created_at, user_id')
        .single()

    if (!error) {
        setPosts(prev =>
        prev.map(p =>
            p.id === buzzId
            ? {
                ...p,
                comments: [
                    ...(p.comments || []),
                    {
                    ...data,
                    users: { username: user.user_metadata.user_name }
                    }
                ]
                }
            : p
        )
        )
        e.target.reset()
    }
    }



  return (
    <div className="w-full max-w-2xl px-4 py-6 text-black">
      <h1 className="text-2xl font-bold mb-6">Search Results for "{query}"</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">No posts found.</p>
      ) : (
        posts.map(post => (
        <BuzzItem
            key={post.id}
            buzz={post}
            user={user}
            onLikeToggle={handleLikeToggle}
            onCommentSubmit={handleCommentSubmit}
        />
        ))

      )}
    </div>
  )
}

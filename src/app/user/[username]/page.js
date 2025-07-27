'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'


export default function UserProfile() {
  const params = useParams()
  const username = params.username
  const [profile, setProfile] = useState(null)
  const [buzzes, setBuzzes] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [openBuzzId, setOpenBuzzId] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      setCurrentUser(sessionUser)

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()
      if (!profileData) return
      setProfile(profileData)

      const { data: buzzesData } = await supabase
        .from('buzzes')
        .select(`
          id, content, created_at, tags, image_url,
          users (username, github_url),
          likes:likes (user_id),
          comments (
              id, content, created_at, user_id,
              users (username, github_url)
          )
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (buzzesData) {
        setBuzzes(transformBuzzes(buzzesData, sessionUser))
      }

      if (sessionUser && profileData) {
        const { data: followCheck } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', sessionUser.id)
          .eq('following_id', profileData.id)
          .single()

        setIsFollowing(!!followCheck)

        const { count: followerCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id)

        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id)

        setFollowerCount(followerCount || 0)
        setFollowingCount(followingCount || 0)
      }
    }

    loadData()
  }, [username])

  const transformBuzzes = (data, user) => {
    return data.map(buzz => {
      const likes = Array.isArray(buzz.likes) ? buzz.likes : []
      return {
        ...buzz,
        likeCount: likes.length,
        likedByUser: user ? likes.some(like => like.user_id === user.id) : false
      }
    })
  }

  const handleLikeToggle = async (buzzId) => {
    if (!currentUser) return

    const buzz = buzzes.find(b => b.id === buzzId)
    const hasLiked = buzz.likedByUser

    if (hasLiked) {
      await supabase.from('likes').delete().eq('buzz_id', buzzId).eq('user_id', currentUser.id)
    } else {
      await supabase.from('likes').insert({ buzz_id: buzzId, user_id: currentUser.id })
    }

    const { data } = await supabase
      .from('buzzes')
      .select(`
        id, content, created_at, tags, image_url,
        users (username, github_url),
        likes:likes (user_id),
        comments (
          id, content, created_at, user_id,
          users (username, github_url)
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (data) {
      setBuzzes(transformBuzzes(data, currentUser))
    }
  }

  const handleCommentDelete = async (commentId, buzzId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (!error) {
      setBuzzes(prev =>
        prev.map(b =>
          b.id === buzzId
            ? { ...b, comments: b.comments.filter(c => c.id !== commentId) }
            : b
        )
      )
    }
  }

  const handleNewComment = async (e, buzzId) => {
    e.preventDefault()
    const content = e.target.comment.value.trim()
    if (!content) return

    const { data } = await supabase
      .from('comments')
      .insert({ content, buzz_id: buzzId, user_id: currentUser.id })
      .select('id, content, created_at, user_id')
      .single()

    if (data) {
      e.target.reset()
      setBuzzes(prev =>
        prev.map(b =>
          b.id === buzzId
            ? {
                ...b,
                comments: [
                  ...(b.comments || []),
                  { ...data, users: { username: currentUser.user_metadata.user_name } }
                ]
              }
            : b
        )
      )
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)

      if (!error) {
        setIsFollowing(false)
        setFollowerCount(prev => Math.max(prev - 1, 0))
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: profile.id })

      if (!error) {
        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    }
  }

  if (!profile) {
    return <main className="p-6 text-black">Loading profile...</main>
  }

  const handleDeleteBuzz = async (buzzId) => {
    const confirmed = window.confirm("Are you sure you want to delete this buzz?")
    if (!confirmed) return

    const { error } = await supabase.from('buzzes').delete().eq('id', buzzId)

    if (!error) {
      setBuzzes(prev => prev.filter(b => b.id !== buzzId))
    } else {
      console.error("Failed to delete buzz:", error)
    }
  }

  return (
    <main className="flex justify-center text-black">
      <div className="w-full max-w-2xl px-4 py-6  border-gray-300">
        <div className="flex items-center gap-4 mb-6">
          <img src={profile.github_url} alt="avatar" className="w-16 h-16 rounded-full border" />
          <div>
            <h1 className="text-3xl font-bold">@{profile.username}</h1>
            <p className="text-gray-400">Joined on {new Date(profile.created_at).toLocaleDateString()}</p>

            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <Link href={`/user/${profile.username}/followers`} className="hover:underline">
                {followerCount} Followers
              </Link>

              <Link href={`/user/${profile.username}/following`} className="hover:underline">
                {followingCount} Following
              </Link>


              {currentUser?.id !== profile.id && (
              <>
                <button
                  onClick={handleFollowToggle}
                  className={`ml-4 px-3 py-1 text-sm rounded ${
                    isFollowing ? 'bg-gray-300 text-black' : 'bg-blue-500 text-white'
                  }`}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <Link
                  href={`/messages/new?to=${profile.username}`}
                  className="ml-2 px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
                >
                  💬 Message
                </Link>
              </>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">Buzzes by {profile.username}</h2>

        {buzzes.length === 0 ? (
          <p className="text-gray-400">This user hasn't posted anything yet.</p>
        ) : (
          buzzes.map(buzz => {
            const isOpen = openBuzzId === buzz.id
            return (
              <div key={buzz.id} className="px-4 py-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <a href={`/user/${profile.username}`}>
                    <img
                      src={profile.github_url}
                      alt="avatar"
                      className="w-10 h-10 rounded-full border border-gray-300 hover:scale-105 transition"
                    />
                  </a>
                  <a href={`/user/${profile.username}`} className="text-lg font-semibold hover:underline">
                    {profile.username}
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
                  <button onClick={() => handleLikeToggle(buzz.id)} className="hover:scale-110 transition">
                    {buzz.likedByUser ? '❤️' : '🤍'} {buzz.likeCount}
                  </button>
                  <button onClick={() => setOpenBuzzId(isOpen ? null : buzz.id)} className="hover:underline">
                    💬 {buzz.comments.length}
                  </button>
                  <div className="flex items-center gap-2 text-xs">
                    <span>{new Date(buzz.created_at).toLocaleString()}</span>
                    {currentUser?.id === profile.id && (
                      <button
                        onClick={() => handleDeleteBuzz(buzz.id)}
                        className="text-red-500 hover:text-red-700 transition"
                        title="Delete post"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>


                {isOpen && (
                  <div className="pt-4 space-y-4 animate-fade-in">
                    {currentUser && (
                      <form onSubmit={e => handleNewComment(e, buzz.id)} className="flex gap-2">
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
                          {currentUser?.id === comment.user_id && (
                            <button
                              onClick={() => handleCommentDelete(comment.id, buzz.id)}
                              className="ml-auto text-xs text-red-500 hover:underline"
                            >
                              delete
                            </button>
                          )}
                        </div>
                        <div className="ml-1">💬 {comment.content}</div>
                      </div>
                    ))}


                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}

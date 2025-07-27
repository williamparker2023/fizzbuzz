'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [user, setUser] = useState(null)
  const [buzzes, setBuzzes] = useState([])
  const router = useRouter()
  const [previewUrl, setPreviewUrl] = useState(null)
  const [sortMode, setSortMode] = useState('trending') 


  function transformBuzzes(data, user) {
    return data.map(buzz => {
      let likes = buzz.likes
      if (!Array.isArray(likes)) {
        likes = likes && typeof likes === 'object' ? [likes] : []
      }

      return {
        ...buzz,
        likeCount: Number(buzz.like_count) || 0,
        likedByUser: user ? likes.some(like => like.user_id === user.id) : false
      }
    })
  }


  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const loadBuzzes = async (mode = 'trending') => {
    let query = supabase
      .from('buzzes')
      .select(`
        id, content, created_at, tags, image_url, like_count,
        users (username, github_url),
        likes:likes (user_id),
        comments (
          id, content, created_at, user_id,
          users (username, github_url)
        )
      `)

    query = mode === 'recent'
      ? query.order('created_at', { ascending: false })
      : query.order('like_count', { ascending: false })

    const { data, error } = await query

    if (!error) {
      const transformed = transformBuzzes(data, user)
      setBuzzes(transformed)
      console.log('Buzzes after reload:', transformed.map(b => ({
        id: b.id,
        likeCount: b.likeCount,
        like_count: b.like_count
      })))
    }
  }




  useEffect(() => {
    if (user) loadBuzzes(sortMode)
  }, [user, sortMode])



  const handleLikeToggle = async (buzzId) => {
    if (!user) {
      alert('Log in to like posts.')
      router.push('/login')
      return
    }

    const buzz = buzzes.find(b => b.id === buzzId)
    const hasLiked = buzz.likedByUser

    let error

    if (hasLiked) {
      const res = await supabase
        .from('likes')
        .delete()
        .eq('buzz_id', buzzId)
        .eq('user_id', user.id)

      error = res.error
    } else {
      const res = await supabase
        .from('likes')
        .insert({ buzz_id: buzzId, user_id: user.id })

      error = res.error
    }

    if (error && !error.message.includes('duplicate key')) {
      console.error('Like toggle error:', error)
      return
    }

    // ✅ Update the local buzz object to avoid reshuffling
    setBuzzes(prevBuzzes =>
      prevBuzzes.map(b =>
        b.id === buzzId
          ? {
              ...b,
              likedByUser: !hasLiked,
              likeCount: hasLiked ? b.likeCount - 1 : b.likeCount + 1
            }
          : b
      )
    )
  }




  const handleNewBuzzSubmit = async (e) => {
    e.preventDefault()
    const content = e.target.newBuzz.value.trim()
    const file = e.target.image.files[0]
    let imageUrl = null

    if (file) {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('buzz-images')
        .upload(filePath, file, {
          contentType: file.type
        })

      if (uploadError) {
        console.error('Image upload failed:', uploadError)
        return
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from('buzz-images')
        .getPublicUrl(filePath)

      imageUrl = publicUrl
    }

    const { error: insertError } = await supabase.from('buzzes').insert({
      content,
      user_id: user.id,
      tags: [],
      image_url: imageUrl,
    })

    if (insertError) {
      console.error('Buzz insert error:', insertError)
      return
    }

    e.target.reset()
    setPreviewUrl(null)

    loadBuzzes()
  }



  const [openBuzzId, setOpenBuzzId] = useState(null)

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
      setBuzzes(prev =>
        prev.map(b =>
          b.id === buzzId
            ? {
                ...b,
                comments: [
                  ...(b.comments || []),
                  {
                    ...data,
                    users: { username: user.user_metadata.user_name }
                  }
                ]
              }
            : b
        )
      )
      e.target.reset()
    }
  }



  return (
    <div className="flex min-h-screen justify-center">
      {/* Main Content */}

      <main className="w-full max-w-2xl px-4">
        {/* New Buzz Form at the top */}
        {user && (
          <form
            onSubmit={handleNewBuzzSubmit}
            className="mb-8 text-blue-600 bg-opacity-10 p-4 rounded shadow animate-slideFade"
          >
            <textarea
              name="newBuzz"
              placeholder="What's buzzing?"
              className="w-full p-3 rounded bg-white text-black  resize-none focus:outline-none focus:ring-2 focus:ring-darkaccent"
              rows={3}
            />
            {previewUrl && (
              <div className="mt-2 flex justify-center items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-40 rounded border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="text-red-500 hover:text-red-700 text-xl"
                  title="Remove image"
                >
                  🗑️
                </button>
              </div>
            )}

            <div className="flex justify-end gap-4 mt-4">
              {/* Image Upload Button */}

              <input
                type="file"
                id="imageUpload"
                name="image"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    setPreviewUrl(URL.createObjectURL(file))
                  } else {
                    setPreviewUrl(null)
                  }
                }}
                />
              <label
                htmlFor="imageUpload"
                className="cursor-pointer text-2xl hover:scale-110 transition flex items-center"
                style={{ lineHeight: '1' }}
              >
                📷
              </label>


              {/* Buzz Submit Button */}
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Buzz
              </button>
            </div>

          </form>
        )}

        <div className="flex mt-4 border-b border-gray-300 pb-2">
          {/* Left Half - Trending */}
          <div className="w-1/2 flex justify-center">
            <button
              onClick={() => setSortMode('trending')}
              className={`pb-1 border-b-2 ${
                sortMode === 'trending'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Trending
            </button>
          </div>

          {/* Right Half - Recent */}
          <div className="w-1/2 flex justify-center">
            <button
              onClick={() => setSortMode('recent')}
              className={`pb-1 border-b-2 ${
                sortMode === 'recent'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Recent
            </button>
          </div>
        </div>



        {/* Feed Header */}
        {/* <div className="flex justify-between items-center mb-6 animate-fadeIn">
          <h1 className="text-3xl font-bold text-black">Fizzbuzz Feed</h1>
          {user && (
            <Link href="/new-buzz">
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                New Buzz
              </button>
            </Link>
          )}
        </div> */}

        {/* Buzzes */}
        {buzzes.map(buzz => {
          const isOpen = openBuzzId === buzz.id

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
                <button onClick={() => handleLikeToggle(buzz.id)} className="hover:scale-110 transition">
                  {buzz.likedByUser ? '❤️' : '🤍'} {buzz.likeCount}
                </button>
                <button onClick={() => setOpenBuzzId(isOpen ? null : buzz.id)} className="hover:underline">
                  💬 {buzz.comments.length}
                </button>
                <span className="text-xs">{new Date(buzz.created_at).toLocaleString()}</span>
              </div>

              {isOpen && (
                <div className="pt-4 space-y-4 animate-fade-in">
                  {user && (
                    <form
                      onSubmit={e => handleCommentSubmit(e, buzz.id)}
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
        })}


      </main>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function FollowingPage() {
  const { username } = useParams()
  const [following, setFollowing] = useState([])

  useEffect(() => {
    const loadFollowing = async () => {
      const { data: profileUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      if (!profileUser) return

      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          users:following_id (
            username,
            github_url,
            id
          )
        `)
        .eq('follower_id', profileUser.id)

      if (error) console.error(error)

      const enriched = await Promise.all(
        (data || []).map(async ({ users }) => {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', users.id)

          return {
            ...users,
            followerCount: count || 0,
          }
        })
      )

      setFollowing(enriched)
    }

    loadFollowing()
  }, [username])

  return (
    <div className="w-full max-w-2xl px-4 py-6 text-black">
      <h1 className="text-2xl font-bold mb-6">Users @{username} is following</h1>

      {following.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          This user isn&rsquo;t following anyone yet.
        </p>
      ) : (
        following.map(user => (
          <div key={user.id} className="border-b border-gray-200 px-4 py-4 flex items-center gap-4">
            <img src={user.github_url} alt="avatar" className="w-10 h-10 rounded-full border" />
            <div>
              <Link href={`/user/${user.username}`} className="font-semibold hover:underline">
                {user.username}
              </Link>
              <p className="text-sm text-gray-500">
                {user.followerCount} {user.followerCount === 1 ? 'Follower' : 'Followers'}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

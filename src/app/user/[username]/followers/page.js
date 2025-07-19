'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function FollowersPage() {
  const { username } = useParams()
  const [followers, setFollowers] = useState([])

  useEffect(() => {
    const loadFollowers = async () => {
      const { data: profileUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      if (!profileUser) return

      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          users:follower_id (
            username,
            github_url,
            id,
            created_at
          )
        `)
        .eq('following_id', profileUser.id)

      if (error) console.error(error)

      // Fetch follower counts for each user
      const enriched = await Promise.all(data.map(async ({ users }) => {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', users.id)

        return {
          ...users,
          followerCount: count || 0
        }
      }))

      setFollowers(enriched)
    }

    loadFollowers()
  }, [username])
    return (
    <div className="w-full max-w-2xl px-4 py-6 text-black">
        <h1 className="text-2xl font-bold mb-6">Followers of @{username}</h1>

        {followers.length === 0 ? (
        <p className="text-gray-500 text-center py-8">This user has no followers yet.</p>
        ) : (
        followers.map(user => (
            <div key={user.id} className="flex items-center gap-4 py-4 border-b border-gray-200">
            <img src={user.github_url} alt="avatar" className="w-12 h-12 rounded-full border" />
            <div>
                <Link href={`/user/${user.username}`} className="text-lg font-semibold hover:underline">
                @{user.username}
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

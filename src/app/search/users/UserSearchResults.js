'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function UserSearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [users, setUsers] = useState([])

  useEffect(() => {
    const loadUsers = async () => {
      if (!query) return

      const { data, error } = await supabase
        .from('users')
        .select('id, username, github_url, created_at')
        .ilike('username', `%${query}%`)

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      // Add follower counts
      const enriched = await Promise.all(data.map(async (user) => {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id)

        return {
          ...user,
          followerCount: count || 0
        }
      }))

      setUsers(enriched)
    }

    loadUsers()
  }, [query])

  return (
    <div className="w-full max-w-2xl px-4 py-6 text-black">
      <h1 className="text-2xl font-bold mb-6">Users matching &quot;{query}&quot;</h1>

      {users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No users found.</p>
      ) : (
        users.map(user => (
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

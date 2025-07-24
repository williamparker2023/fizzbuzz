'use client'
import './globals.css'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'


export default function RootLayout({ children }) {
  const [user, setUser] = useState(null)
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    const checkAndInsertUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) return console.error('Error getting user:', authError)
      if (!user) return

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert({
          id: user.id,
          username: user.user_metadata.user_name || user.email,
          github_url: user.user_metadata.avatar_url || '',
          created_at: new Date().toISOString()
        })

        if (insertError) console.error('INSERT ERROR:', insertError.message)
        else console.log('✅ User inserted into users table')
      }
    }

    checkAndInsertUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    location.reload()
  }

  return (
    <html lang="en">
      <body className="bg-white text-black font-sans">

      {/* Top Bar */}
      <div className="w-full border-b border-gray-300 bg-white sticky top-0 z-50">
      <div className="relative h-16 w-full flex items-center bg-white sticky top-0 z-50">
        {/* Left-aligned Fizzbuzz logo */}
        <div className="pl-6">
          <h1 className="text-2xl font-bold text-blue-500">Fizzbuzz</h1>
        </div>

        {/* Absolutely centered Search Bar */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-full max-w-md">
        <input
          type="text"
          value={query}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // slight delay so buttons can be clicked
          onChange={(e) => {
            setQuery(e.target.value)
            setShowDropdown(true)
          }}
          placeholder="Search users or posts..."
          className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />


        {showDropdown && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-300 rounded shadow z-50">
            <button
              onClick={() => {
                router.push(`/search/users?q=${encodeURIComponent(query)}`)
                setShowDropdown(false)
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              🔍 Search users for "{query || '...'}"
            </button>
            <button
              onClick={() => {
                router.push(`/search/posts?q=${encodeURIComponent(query)}`)
                setShowDropdown(false)
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              📝 Search posts for "{query || '...'}"
            </button>
          </div>
        )}

        </div>
      </div>

      </div>




        {/* Fixed Sidebar on Far Left */}
        <aside className="fixed left-0 top-0 h-screen w-64 pt-16 p-4 border-r border-gray-300 bg-white z-10">

          <div className="flex flex-col space-y-6 mt-4">
            <Link href="/">
              <button className={`w-full text-left py-2 px-3 rounded-md hover:bg-blue-100 transition ${pathname === '/' ? 'bg-blue-200 font-semibold' : ''}`}>
                Home
              </button>
            </Link>

            {user && (
              <Link href={`/user/${user.user_metadata.user_name}`}>
                <button className={`w-full text-left py-2 px-3 rounded-md hover:bg-blue-100 transition ${pathname.includes('/user/') ? 'bg-blue-200 font-semibold' : ''}`}>
                  My Profile
                </button>
              </Link>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-left py-2 px-3 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded transition"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={async () => {
                  await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                      queryParams: { prompt: 'login' },
                      redirectTo: 'http://localhost:3000/callback'
                    }
                  })
                }}
                className="w-full text-left py-2 px-3 bg-blue-600 text-white hover:bg-blue-700 rounded transition"
              >
                Login with GitHub
              </button>
            )}


          </div>
        </aside>

        {/* Main Feed, Centered on Screen */}
        <main className="relative min-h-screen">

          {/* Absolutely center the feed on the screen */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 py-8">
            {children}
          </div>

        </main>

      </body>
    </html>
  )
}

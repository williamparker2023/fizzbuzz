'use client'
import './globals.css'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null)
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768


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
          <div className="relative h-16 w-full flex items-center justify-between px-4 md:px-6">

            {/* Mobile Sidebar Toggle */}
            <button
              className="md:hidden text-2xl"
              onClick={() => setSidebarOpen(prev => !prev)}
            >
              ☰
            </button>

            {/* Logo */}
            <h1 className="text-2xl font-bold text-blue-500">Fizzbuzz</h1>

            {/* Search Bar */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-[80%] max-w-sm sm:w-full">


              <input
                type="text"
                value={query}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowDropdown(true)
                }}
                placeholder="🔍 Search users or posts..."
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
                    🔍 Search users for &quot;{query || '...'}&quot;
                  </button>
                  <button
                    onClick={() => {
                      router.push(`/search/posts?q=${encodeURIComponent(query)}`)
                      setShowDropdown(false)
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    🔍 Search posts for &quot;{query || '...'}&quot;
                  </button>
                </div>
              )}
            </div>

            <div className="w-8 md:hidden" /> {/* spacing to balance mobile menu */}
          </div>
        </div>

        {/* Sidebar (absolute so it doesn't push content) */}
        <aside className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 p-4 border-r border-gray-300 bg-white z-40
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:block
        `}>
          <div className="flex flex-col space-y-6">
            <Link href="/">
              <button className={`w-full text-left py-2 px-3 rounded-md hover:bg-blue-100 transition ${pathname === '/' ? 'bg-blue-200 font-semibold' : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false)
              }}>
                Home
              </button>
            </Link>
            {user && (
              <Link href={`/user/${user.user_metadata.user_name}`}>
                <button className={`w-full text-left py-2 px-3 rounded-md hover:bg-blue-100 transition ${pathname.includes('/user/') ? 'bg-blue-200 font-semibold' : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false)
                }}>
                  My Profile
                </button>
              </Link>
            )}
            <Link href="/messages">
              <button className={`w-full text-left py-2 px-3 rounded-md hover:bg-blue-100 transition ${pathname === '/messages' ? 'bg-blue-200 font-semibold' : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false)
              }}>
                Messages
              </button>
            </Link>
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
                      redirectTo: 'https://fizzbuzz-social.vercel.app/callback'
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

        {/* Main Feed (visually centered regardless of sidebar) */}
        <main className="flex justify-center min-h-screen pt-8">
          <div className="w-full max-w-2xl px-4">
            {children}
          </div>
        </main>


      </body>
    </html>
  )
}

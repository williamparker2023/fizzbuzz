'use client'
import './globals.css'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null)
  const pathname = usePathname()

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

        {/* Fixed Sidebar on Far Left */}
        <aside className="fixed left-0 top-0 h-screen w-64 p-4 border-r border-gray-300 bg-white z-10">
          <h1 className="text-2xl font-bold text-blue-500 mb-6">Fizzbuzz</h1>

          <div className="flex flex-col space-y-6 mt-4">
            <Link href="/">
              <button className={`w-full text-left py-2 px-3 rounded-md hover:bg-blue-100 transition ${pathname === '/' ? 'bg-blue-200 font-semibold' : ''}`}>
                Home
              </button>
            </Link>

            {user && (
              <Link href={`/user/${user.user_metadata.user_name}`}>
                <button className={`w-full text-left py-2 px-3 rounded-md hover:bg-blue-100 transition ${pathname.includes('/user') ? 'bg-blue-200 font-semibold' : ''}`}>
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

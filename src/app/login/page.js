'use client'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
        queryParams: {
        prompt: 'login'  // <--- this forces GitHub to show the account picker
        },
        redirectTo: 'https://fizzbuzz-social.vercel.app/callback'
    }
    })
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-6">Welcome to Fizzbuzz 🚀</h1>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={handleLogin}
      >
        Login with GitHub
      </button>
    </main>
  )
}

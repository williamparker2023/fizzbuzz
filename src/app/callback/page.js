'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Callback() {
  const router = useRouter()

  useEffect(() => {
    const finishLogin = async () => {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (session) {
        router.push('/') // or wherever you want to land
      } else {
        console.error('Login error:', error)
        router.push('/login')
      }
    }

    finishLogin()
  }, [router])

  return <p className="p-4">Completing login...</p>
}

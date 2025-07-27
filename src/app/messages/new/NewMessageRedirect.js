'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewMessageRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUsername = searchParams.get('to')

  useEffect(() => {
    const createOrRedirect = async () => {
      if (!targetUsername) return

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        alert('You must be logged in to send a message.')
        return
      }

      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', targetUsername)
        .single()

      if (!targetUser) {
        alert('User not found.')
        return
      }

      const [id1, id2] = [currentUser.id, targetUser.id].sort()

      const { data: existing, error: existingError } = await supabase
        .from('messages')
        .select('id')
        .or(
          `and(sender_id.eq.${id1},receiver_id.eq.${id2}),and(sender_id.eq.${id2},receiver_id.eq.${id1})`
        )
        .limit(1)
        .single()


      if (existingError) {
        console.error('Error checking for existing message:', existingError)
        return
      }

      if (existing) {
        router.push(`/messages/${existing.id}`)
      } else {
        const { data: newConv, error } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUser.id,
            receiver_id: targetUser.id,
            content: 'Conversation started'
          })
          .select('id')
          .single()

        if (error) {
          alert('Error creating message')
          console.error(error)
        } else {
          router.push(`/messages/${newConv.id}`)
        }
      }
    }

    createOrRedirect()
  }, [targetUsername, router])

  return <p className="p-6 text-black">Starting message...</p>
}

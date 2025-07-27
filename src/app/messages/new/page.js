// app/messages/new/page.js
import { Suspense } from 'react'
import NewMessageRedirect from './NewMessageRedirect'

export default function NewMessagePage() {
  return (
    <Suspense fallback={<p className="p-6 text-black">Loading...</p>}>
      <NewMessageRedirect />
    </Suspense>
  )
}

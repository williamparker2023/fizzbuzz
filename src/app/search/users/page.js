// app/search/users/page.js
import { Suspense } from 'react'
import UserSearchResults from './UserSearchResults'

export default function SearchUsersPage() {
  return (
    <Suspense fallback={<p className="p-6 text-black">Loading...</p>}>
      <UserSearchResults />
    </Suspense>
  )
}

// src/app/search/posts/page.js
import { Suspense } from 'react'
import PostSearchResults from './PostSearchResults'

export default function SearchPostsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-black">Loading...</p>}>
      <PostSearchResults />
    </Suspense>
  )
}


// src/pages/posts/[slug].js
import React from 'react';
import { useRouter } from 'next/router';

// This is a placeholder component to satisfy the default export requirement
// for files within the Next.js 'pages' directory.

function PostPage() {
  const router = useRouter();
  const { slug } = router.query;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Post: {slug}</h1>
      <p>This page is a placeholder for the dynamic route <code>/posts/{slug}</code>.</p>
      <p>
        If this route (<code>src/pages/posts/[slug].js</code>) is not intentionally part of your application,
        consider removing this file. For new route development, it's recommended to use
        the Next.js App Router (files within the <code>src/app</code> directory).
      </p>
      <p>
        Current project structure primarily uses the App Router. This file might be a remnant
        or an unintentional addition causing build issues.
      </p>
    </div>
  );
}

export default PostPage;

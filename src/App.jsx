import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Routes, Route } from 'react-router-dom';
import PostList from './pages/PostList';
import PostWrite from './pages/PostWrite';
import PostDetail from './pages/PostDetail';
import PostEdit from './pages/PostEdit';
import './App.css';

function App() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.log('에러:', error);
        return;
      }
      setPosts(data);
    }

    fetchPosts();
  }, []);

  return (
    <div className="app">
      <h1>게시판</h1>

      <Routes>
        <Route path="/" element={<PostList posts={posts} />} />
        <Route
          path="/write"
          element={<PostWrite posts={posts} setPosts={setPosts} />}
        />
        <Route
          path="/post/:id"
          element={<PostDetail posts={posts} setPosts={setPosts} />}
        />
        <Route
          path="/edit/:id"
          element={<PostEdit posts={posts} setPosts={setPosts} />}
        />
      </Routes>
    </div>
  );
}

export default App;

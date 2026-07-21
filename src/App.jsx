import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useUser } from './AuthContext';
import PostList from './pages/PostList';
import PostWrite from './pages/PostWrite';
import PostDetail from './pages/PostDetail';
import PostEdit from './pages/PostEdit';
import Login from './pages/Login';
import Signup from './pages/Signup';
import './App.css';

function App() {
  const [posts, setPosts] = useState([]);
  const user = useUser(); // 로그인한 사용자 (없으면 null)
  const navigate = useNavigate();

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

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <h1>게시판</h1>
        </Link>

        <div className="auth-menu">
          {user ? (
            // 로그인한 상태: 이메일 + 로그아웃 버튼
            <>
              <span className="user-email">{user.email}</span>
              <button className="btn" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            // 로그인 안 한 상태: 로그인 + 회원가입 버튼
            <>
              <Link to="/login" className="btn">
                로그인
              </Link>
              <Link to="/signup" className="btn">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<PostList posts={posts} />} />

        {/* 글쓰기는 로그인해야만 가능. 아니면 로그인 페이지로 보냄 */}
        <Route
          path="/write"
          element={
            user ? (
              <PostWrite posts={posts} setPosts={setPosts} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/post/:id"
          element={<PostDetail posts={posts} setPosts={setPosts} />}
        />

        {/* 수정도 로그인해야만 가능 */}
        <Route
          path="/edit/:id"
          element={
            user ? (
              <PostEdit posts={posts} setPosts={setPosts} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </div>
  );
}

export default App;

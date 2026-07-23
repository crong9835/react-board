import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useUser, useAuthLoading } from './AuthContext';
import PostList from './pages/PostList';
import PostWrite from './pages/PostWrite';
import PostDetail from './pages/PostDetail';
import PostEdit from './pages/PostEdit';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  const [posts, setPosts] = useState([]);
  // 글 목록을 아직 불러오는 중인지 여부 (처음엔 true = 불러오는 중)
  const [loading, setLoading] = useState(true);
  const user = useUser();
  // 로그인 여부를 아직 확인하는 중인지
  const authLoading = useAuthLoading();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.log('에러:', error);
        setLoading(false); // 실패했어도 불러오기 시도는 끝났음
        return;
      }
      setPosts(data);
      setLoading(false); // 불러오기 완료
    }

    fetchPosts();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  // 로그인 여부를 아직 모르는 동안에는 화면을 그리지 않는다.
  // (모르는 상태로 그리면 /write 같은 보호 라우트가 "로그인 안 함"으로 잘못 판정해서
  //  로그인 페이지로 튕겨버림)
  if (authLoading) {
    return (
      <div className="app">
        <p className="empty">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <h1>게시판</h1>
        </Link>

        <div className="auth-menu">
          {user ? (
            <>
              <span className="user-email">{user.email}</span>
              <button className="btn" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
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
        <Route
          path="/"
          element={<PostList posts={posts} loading={loading} />}
        />

        {/* 글쓰기는 로그인해야만 가능. 아니면 로그인 페이지로 보냄
            replace 를 붙이면 이 이동이 방문 기록에 쌓이지 않습니다.
            안 붙이면 "목록 → 로그인" 기록이 남아서, 뒤로가기를 눌러도
            다시 로그인 페이지로 튕겨 나와 목록으로 돌아갈 수 없습니다. */}
        <Route
          path="/write"
          element={
            user ? (
              <PostWrite posts={posts} setPosts={setPosts} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/post/:id"
          element={
            <PostDetail posts={posts} setPosts={setPosts} loading={loading} />
          }
        />

        <Route
          path="/edit/:id"
          element={
            user ? (
              <PostEdit posts={posts} setPosts={setPosts} loading={loading} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 이미 로그인한 사람에게 로그인/회원가입 페이지는 의미가 없으므로 홈으로 보냅니다. */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" replace /> : <Signup />}
        />

        {/* 위의 어떤 주소와도 맞지 않을 때 (예: /asdf) 보여줄 페이지 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;

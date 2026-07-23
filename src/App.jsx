import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { useUser, useAuthLoading } from './AuthContext';
import { formatWriter } from './format';
import PostList from './pages/PostList';
import PostWrite from './pages/PostWrite';
import PostDetail from './pages/PostDetail';
import PostEdit from './pages/PostEdit';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import ComingSoon from './pages/ComingSoon';
import './App.css';

// 헤더 네비게이션 메뉴 목록. 메뉴를 넣고 빼려면 이 배열만 고치면 됩니다.
// path 가 '/soon/...' 인 것은 아직 안 만든 메뉴라 "준비 중" 페이지로 갑니다.
const NAV_MENUS = [
  { name: '유머 모음집', path: '/' },
  { name: '인기글', path: '/soon/인기글' },
  { name: '자유게시판', path: '/soon/자유게시판' },
  { name: '공지사항', path: '/soon/공지사항' },
];

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useUser();
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
      setLoading(false);
    }

    fetchPosts();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  // 로그인 여부를 아직 모르는 동안에는 화면을 그리지 않습니다.
  // 모르는 상태로 그리면 /write 같은 보호 라우트가 "로그인 안 함"으로 잘못 판정해
  // 로그인 페이지로 튕겨버립니다.
  if (authLoading) {
    return (
      <div className="page">
        <main className="app">
          <p className="empty">불러오는 중...</p>
        </main>
      </div>
    );
  }

  // 화면 구조
  //   .page         화면 전체를 세로로 채웁니다.
  //   .header       화면 전체 폭을 쓰는 띠. 안쪽 .header-inner 만 폭을 제한합니다.
  //   .app > .card  본문. 배경 위에 떠 있는 흰 카드입니다.
  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo">
            <h1>와이라누</h1>
          </Link>

          {/* NavLink 는 Link 와 같지만 "지금 보고 있는 주소인지"(isActive)를 알려줍니다.

              end 를 붙인 이유: '/' 는 모든 주소의 앞부분과 겹쳐서, end 가 없으면
              /post/3 을 볼 때도 '유머 모음집' 이 켜진 것으로 표시됩니다.
              end 는 "주소가 정확히 같을 때만" 이라는 뜻입니다. */}
          <nav className="nav">
            {NAV_MENUS.map((menu) => (
              <NavLink
                key={menu.path}
                to={menu.path}
                end={menu.path === '/'}
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link-active' : 'nav-link'
                }
              >
                {menu.name}
              </NavLink>
            ))}
          </nav>

          <div className="auth-menu">
            {user ? (
              <>
                <span className="user-email">{formatWriter(user.email)}</span>
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
        </div>
      </header>

      <main className="app">
        <div className="card">
          <Routes>
            <Route
              path="/"
              element={<PostList posts={posts} loading={loading} />}
            />

            {/* 글쓰기는 로그인해야만 가능. 아니면 로그인 페이지로 보냅니다.
                replace 를 안 붙이면 "목록 → 로그인" 이 방문 기록에 쌓여서,
                뒤로가기를 눌러도 다시 로그인 페이지로 튕겨 나옵니다. */}
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
                <PostDetail
                  posts={posts}
                  setPosts={setPosts}
                  loading={loading}
                />
              }
            />

            <Route
              path="/edit/:id"
              element={
                user ? (
                  <PostEdit
                    posts={posts}
                    setPosts={setPosts}
                    loading={loading}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* 이미 로그인한 사람을 홈으로 돌려보내는 처리는 각 페이지 안에서 합니다.
                여기서 user 로 판단하면, 회원가입이 성공해 로그인되는 순간
                페이지가 사라져서 "회원가입이 완료되었습니다" 모달을 띄울 수 없습니다. */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* 아직 안 만든 메뉴. :name 자리에 메뉴 이름이 들어옵니다. (예: /soon/인기글) */}
            <Route path="/soon/:name" element={<ComingSoon />} />

            {/* 위의 어떤 주소와도 맞지 않을 때 (예: /asdf) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;

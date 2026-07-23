import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import { toKoreanAuthError } from '../authErrors';
import Modal from '../components/Modal';

function Login() {
  const navigate = useNavigate();
  const user = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // 이 페이지에 처음 들어온 순간 이미 로그인 상태였는지 기억해 둡니다.
  // (자세한 설명은 Signup.jsx 의 같은 코드에 적어두었습니다)
  const [wasAlreadyLoggedIn] = useState(user !== null);

  // 원래 로그인한 사람이 주소창으로 들어온 경우에만 목록으로 돌려보냅니다.
  if (wasAlreadyLoggedIn) {
    return <Navigate to="/" replace />;
  }

  function openModal(message) {
    setModalMessage(message);
    setIsModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // 서버에 보내기 전에 빈 값부터 걸러냅니다.
    // trim() 은 앞뒤 공백을 없앤 값이라, 공백만 입력한 경우도 빈 값으로 봅니다.
    if (!email.trim() || !password.trim()) {
      openModal('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      openModal('로그인 실패: ' + toKoreanAuthError(error));
      return;
    }

    navigate('/');
  }

  return (
    <div>
      <h2>로그인</h2>

      <form className="form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          로그인
        </button>
      </form>

      <p className="auth-switch">
        계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>

      {/* 안내용 모달 (확인 버튼 하나) */}
      <Modal
        isOpen={isModalOpen}
        message={modalMessage}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default Login;

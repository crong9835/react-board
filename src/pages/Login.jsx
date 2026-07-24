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

    // trim() 으로 앞뒤 공백을 없애서, 공백만 입력한 경우도 빈 값으로 봅니다.
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

    // replace 는 "방문 기록에 새로 쌓지 말고 지금 자리를 대신 차지하라"는 뜻입니다.
    // 이걸 안 붙이면 기록이 [... , /login, /] 이 되어, 홈에서 뒤로가기를 누르면
    // /login 으로 돌아갑니다. 그런데 이미 로그인한 상태라 위쪽 판정이 다시 홈으로
    // 돌려보내서, 뒤로가기가 한 번 헛도는 것처럼 보입니다.
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-page">
      <h2>로그인</h2>

      <form className="form" onSubmit={handleSubmit}>
        {/* aria-label 은 화면에는 안 보이지만 스크린 리더가 읽어주는 이름입니다.
            placeholder 는 타이핑을 시작하면 사라져서 "이 칸이 무엇인지" 알려주는
            역할을 온전히 하지 못하므로, 접근성을 위해 aria-label 을 함께 답니다. */}
        <input
          type="email"
          placeholder="이메일"
          aria-label="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          aria-label="비밀번호"
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

      <Modal
        isOpen={isModalOpen}
        message={modalMessage}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default Login;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { toKoreanAuthError } from '../authErrors';
import Modal from '../components/Modal';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  // 모달을 닫은 뒤 로그인 페이지로 이동할지 여부
  const [goToLoginAfterClose, setGoToLoginAfterClose] = useState(false);

  function openModal(message) {
    setModalMessage(message);
    setIsModalOpen(true);
  }

  // 모달을 닫을 때 실행. 회원가입 성공이었으면 로그인 페이지로 이동합니다.
  function handleModalClose() {
    setIsModalOpen(false);
    if (goToLoginAfterClose) {
      navigate('/login');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      openModal('회원가입 실패: ' + toKoreanAuthError(error));
      return;
    }

    // 회원가입 시 Supabase가 세션을 바로 만들어 자동 로그인되는 것을 막고,
    // 사용자가 직접 로그인하도록 세션을 끊어줍니다.
    await supabase.auth.signOut();

    setGoToLoginAfterClose(true);
    openModal('회원가입 완료! 로그인해 주세요.');
  }

  return (
    <div>
      <h2>회원가입</h2>

      <form className="form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          회원가입
        </button>
      </form>

      <p className="auth-switch">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>

      {/* 안내용 모달 (확인 버튼 하나) — 회원가입 성공이면 확인 시 로그인 페이지로 이동 */}
      <Modal
        isOpen={isModalOpen}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </div>
  );
}

export default Signup;

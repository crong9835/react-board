import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import { toKoreanAuthError } from '../authErrors';
import Modal from '../components/Modal';

function Signup() {
  const navigate = useNavigate();
  const user = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  // 모달을 닫은 뒤 이동할 주소. null 이면 그냥 닫기만 합니다.
  const [pathAfterClose, setPathAfterClose] = useState(null);

  // 이 페이지에 처음 들어온 순간 이미 로그인 상태였는지 기억해 둡니다.
  //
  // useState 의 초기값은 처음 한 번만 쓰이고 그 뒤로는 바뀌지 않습니다.
  // 그래서 가입에 성공해 로그인되더라도 이 값은 false 그대로입니다.
  // 덕분에 "원래 로그인한 사람이 들어온 경우"와 "방금 가입해서 로그인된 경우"를
  // 구분할 수 있습니다.
  //
  // 이 구분이 없으면, 가입 성공으로 user 가 채워지는 순간 이 페이지가 사라져서
  // "회원가입이 완료되었습니다" 모달이 화면에 나타나지도 못하고 끝납니다.
  const [wasAlreadyLoggedIn] = useState(user !== null);

  // 원래 로그인한 사람이 주소창으로 들어온 경우에만 목록으로 돌려보냅니다.
  if (wasAlreadyLoggedIn) {
    return <Navigate to="/" replace />;
  }

  function openModal(message) {
    setModalMessage(message);
    setIsModalOpen(true);
  }

  // 모달을 닫을 때 실행. 갈 곳이 정해져 있으면 그리로 이동합니다.
  function handleModalClose() {
    setIsModalOpen(false);
    if (pathAfterClose) {
      navigate(pathAfterClose);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // 서버에 보내기 전에 빈 값부터 걸러냅니다.
    // trim() 은 앞뒤 공백을 없앤 값이라, 공백만 입력한 경우도 빈 값으로 봅니다.
    if (!email.trim() || !password.trim()) {
      openModal('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    // 이메일 형식 검사.
    //
    // 입력칸의 type="email" 만으로는 부족합니다. 브라우저의 기본 검사는
    // 도메인에 점이 있는지를 보지 않아서 1@1 이나 haha@haha 도 통과시킵니다.
    // 그래서 한 겹 더 봅니다.
    //
    // 규칙을 나눠 읽으면 이렇습니다.
    //   ^[^\s@]+   @ 앞에 공백도 @ 도 아닌 글자가 1자 이상   (예: crong9835)
    //   @          @ 가 정확히 하나
    //   [^\s@]+    도메인 이름                                (예: gmail)
    //   \.         점 하나
    //   [^\s@]{2,} 점 뒤에 2자 이상                            (예: com)
    //
    // 통과: crong9835@gmail.com  /  막힘: 1@1, haha@haha, crong9835@gmail
    //
    // 이건 보안이 아니라 오타 방지입니다. gmail.com 을 gmail 로 잘못 적고 가입하면
    // 나중에 비밀번호 찾기 메일을 받을 수 없기 때문에 미리 잡아줍니다.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(email.trim())) {
      openModal('올바른 이메일 주소를 입력해 주세요. (예: name@example.com)');
      return;
    }

    // Supabase 의 기본 최소 길이가 6자입니다.
    // 서버도 막아주지만, 여기서 먼저 알려주는 편이 빠릅니다.
    if (password.length < 6) {
      openModal('비밀번호는 6자 이상으로 입력해 주세요.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      openModal('회원가입 실패: ' + toKoreanAuthError(error));
      return;
    }

    // Supabase 의 "Confirm email" 설정이 켜져 있으면 가입만 되고 세션은 만들어지지
    // 않습니다. 꺼져 있으면 가입과 동시에 로그인된 상태가 됩니다.
    // 설정을 나중에 바꾸더라도 안내가 어긋나지 않도록, 가정하지 않고
    // 실제로 세션이 왔는지를 보고 갈라놓습니다.
    if (data.session) {
      // 인증이 꺼져 있는 경우 — 이미 로그인된 상태이므로 그대로 두고 목록으로 갑니다.
      setPathAfterClose('/');
      openModal('회원가입이 완료되었습니다.');
      return;
    }

    // 인증이 켜져 있는 경우 — 메일로 확인을 마친 뒤 직접 로그인해야 합니다.
    setPathAfterClose('/login');
    openModal('가입 확인 메일을 보냈습니다. 메일함을 확인해 주세요.');
  }

  return (
    <div className="auth-page">
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

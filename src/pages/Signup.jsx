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
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  // 모달을 닫은 뒤 이동할 주소. null 이면 그냥 닫기만 합니다.
  const [pathAfterClose, setPathAfterClose] = useState(null);

  // true 인 동안 회원가입 버튼을 막습니다.
  // 버튼을 빠르게 두 번 눌러 가입 요청이 두 번 나가는 것을 막기 위한 값입니다.
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  //
  // replace 는 "방문 기록에 새로 쌓지 말고 지금 자리를 대신 차지하라"는 뜻입니다.
  // 가입을 마친 뒤에는 이 페이지로 돌아올 일이 없으므로, 기록에서 아예 지워
  // 뒤로가기를 눌렀을 때 가입 폼이 다시 나타나지 않게 합니다.
  function handleModalClose() {
    setIsModalOpen(false);
    if (pathAfterClose) {
      navigate(pathAfterClose, { replace: true });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // trim() 으로 앞뒤 공백을 없애서, 공백만 입력한 경우도 빈 값으로 봅니다.
    const trimmedNickname = nickname.trim();

    if (!email.trim() || !trimmedNickname || !password.trim()) {
      openModal('이메일, 비밀번호, 닉네임을 모두 입력해 주세요.');
      return;
    }

    // 이메일 형식 검사. 입력칸의 type="email" 만으로는 부족합니다.
    // 브라우저 기본 검사는 도메인에 점이 있는지를 보지 않아 1@1, haha@haha 도
    // 통과시킵니다. 오타로 gmail.com 을 gmail 로 적고 가입하면 나중에 비밀번호
    // 찾기 메일을 받을 수 없으므로 한 겹 더 봅니다.
    //
    // 규칙을 나눠 읽으면 이렇습니다.
    //   ^[^\s@]+   @ 앞에 공백도 @ 도 아닌 글자가 1자 이상   (예: crong9835)
    //   @          @ 가 정확히 하나
    //   [^\s@]+    도메인 이름                                (예: gmail)
    //   \.         점 하나
    //   [^\s@]{2,} 점 뒤에 2자 이상                            (예: com)
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

    // 닉네임 형식 검사.
    //   [가-힣a-zA-Z0-9]  한글·영문·숫자만 (공백과 특수문자는 받지 않습니다)
    //   {2,10}            2자 이상 10자 이하
    //
    // 특수문자를 막는 데는 이유가 하나 더 있습니다. 아래 중복 검사에 쓰는 ilike 는
    // % 와 _ 를 "아무 글자" 라는 뜻으로 해석해서, 그대로 두면 %% 같은 닉네임이
    // 남의 닉네임까지 걸려버립니다.
    const nicknamePattern = /^[가-힣a-zA-Z0-9]{2,10}$/;

    if (!nicknamePattern.test(trimmedNickname)) {
      openModal('닉네임은 한글·영문·숫자로 2~10자로 입력해 주세요.');
      return;
    }

    // 여기서부터 서버에 요청을 보냅니다. 버튼을 잠가 중복 제출을 막습니다.
    setIsSubmitting(true);

    // 닉네임이 이미 쓰이고 있는지 확인합니다.
    //   ilike       대소문자를 가리지 않고 비교합니다. (crong 과 Crong 을 같게 봄)
    //   maybeSingle 한 줄만 가져오되, 없으면 에러 대신 null 을 줍니다.
    //
    // 이 검사만으로 완전히 막히지는 않습니다. 두 사람이 같은 순간에 같은 닉네임으로
    // 가입을 누르면 둘 다 "비어 있음" 으로 통과할 수 있습니다.
    // 마지막으로 막는 것은 DB 에 걸어둔 unique 제약이고, 여기서는 흔한 경우를
    // 미리 걸러 안내를 친절하게 하는 것이 목적입니다.
    const { data: sameNickname, error: nicknameError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('nickname', trimmedNickname)
      .maybeSingle();

    if (nicknameError) {
      console.log('닉네임 확인 에러:', nicknameError);
      setIsSubmitting(false);
      openModal('닉네임을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (sameNickname) {
      setIsSubmitting(false);
      openModal('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
      return;
    }

    // options.data 에 넣은 값은 계정 정보에 함께 저장됩니다.
    // DB 에 걸어둔 트리거가 가입 직후 이 값을 읽어 profiles 표에 닉네임 줄을 만듭니다.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname: trimmedNickname },
      },
    });

    if (error) {
      setIsSubmitting(false);
      openModal('회원가입 실패: ' + toKoreanAuthError(error));
      return;
    }

    // 이미 가입된 이메일인지 확인합니다.
    //
    // "이 이메일은 이미 가입돼 있습니다" 라고 그대로 알려주면, 아무나 이메일을
    // 하나씩 넣어보며 누가 이 사이트에 가입했는지 알아낼 수 있습니다.
    // 그래서 Supabase 는 "Confirm email" 설정이 켜져 있을 때, 이미 있는 이메일로
    // 가입을 시도해도 에러를 주지 않고 성공한 것처럼 응답합니다.
    //
    // 다만 이때는 identities(그 계정에 연결된 로그인 수단 목록)가 빈 배열로 옵니다.
    // 진짜 새 계정이라면 방금 만든 이메일 로그인 수단이 하나 들어 있습니다.
    // 이 차이로 둘을 구분할 수 있습니다.
    //
    // 이 검사가 없으면 이미 가입된 이메일로 또 가입했을 때
    // "가입 확인 메일을 보냈습니다" 라고 잘못 안내하게 됩니다.
    const identities = data.user ? data.user.identities : null;

    if (identities && identities.length === 0) {
      setIsSubmitting(false);
      openModal('회원가입 실패: 이미 가입된 이메일입니다.');
      return;
    }

    // Supabase 의 "Confirm email" 설정이 켜져 있으면 가입만 되고 세션은 만들어지지
    // 않습니다. 꺼져 있으면 가입과 동시에 로그인된 상태가 됩니다.
    // 설정을 나중에 바꿔도 안내가 어긋나지 않도록 실제 세션 유무로 갈라놓습니다.
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
          placeholder="비밀번호 (6자 이상)"
          aria-label="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="text"
          placeholder="닉네임 (한글·영문·숫자 2~10자)"
          aria-label="닉네임"
          value={nickname}
          maxLength={10}
          onChange={(e) => setNickname(e.target.value)}
        />
        <p className="form-hint">
          닉네임은 글쓴이 이름으로 표시되며, 가입 후에는 변경할 수 없습니다.
        </p>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? '가입 중...' : '회원가입'}
        </button>
      </form>

      <p className="auth-switch">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>

      <Modal
        isOpen={isModalOpen}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </div>
  );
}

export default Signup;

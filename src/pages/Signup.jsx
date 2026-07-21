import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { toKoreanAuthError } from '../authErrors';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    // 이메일 + 비밀번호로 회원가입
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert('회원가입 실패: ' + toKoreanAuthError(error));
      return;
    }

    // 회원가입 시 Supabase가 세션을 바로 만들어 자동 로그인되는 것을 막고,
    // 사용자가 직접 로그인하도록 세션을 끊어줍니다.
    await supabase.auth.signOut();

    alert('회원가입 완료! 로그인해 주세요.');
    navigate('/login');
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
    </div>
  );
}

export default Signup;

// Supabase 인증 에러 메시지(영문)를 한글로 바꿔주는 도우미입니다.

// 자주 나오는 에러 메시지를 한글로 정리해 둔 표
const messageMap = [
  {
    match: 'Invalid login credentials',
    ko: '이메일 또는 비밀번호가 올바르지 않습니다.',
  },
  {
    match: 'Email not confirmed',
    ko: '이메일 인증이 아직 완료되지 않았습니다.',
  },
  {
    match: 'User already registered',
    ko: '이미 가입된 이메일입니다.',
  },
  {
    match: 'already registered',
    ko: '이미 가입된 이메일입니다.',
  },
  {
    match: 'Password should be at least',
    ko: '비밀번호는 6자 이상이어야 합니다.',
  },
  {
    match: 'Signup requires a valid password',
    ko: '비밀번호를 입력해 주세요.',
  },
  {
    match: 'Unable to validate email address',
    ko: '이메일 형식이 올바르지 않습니다.',
  },
  {
    match: 'invalid format',
    ko: '이메일 형식이 올바르지 않습니다.',
  },
  // 가입할 때 DB 트리거가 profiles 에 닉네임 줄을 만드는데, 그게 실패하면
  // Supabase 는 이 문구로 답합니다. 여기서 실패하는 이유는 사실상 닉네임 중복
  // 하나뿐입니다. (가입 직전 중복 검사를 통과한 뒤, 같은 순간에 다른 사람이
  // 같은 닉네임으로 먼저 가입해버린 드문 경우)
  {
    match: 'Database error saving new user',
    ko: '이미 사용 중인 닉네임입니다. 다른 닉네임으로 다시 시도해 주세요.',
  },
  {
    match: 'For security purposes',
    ko: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
  },
  {
    match: 'rate limit',
    ko: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
  },
];

// 에러 객체(또는 메시지)를 받아 한글 문구로 돌려줍니다.
// 표에 없는 에러는 기본 안내 문구를 보여줍니다.
export function toKoreanAuthError(error) {
  // error 는 보통 { message: '...' } 객체지만 문자열이 올 수도 있어 둘 다 받습니다.
  let raw = '';
  if (error && error.message) {
    raw = error.message;
  } else if (error) {
    raw = String(error);
  }

  const found = messageMap.find((item) => raw.includes(item.match));
  return found ? found.ko : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

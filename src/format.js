// 값의 모양을 바꾸는 함수들을 모아둔 파일입니다.

// 이메일에서 @ 앞부분만 잘라 작성자 이름으로 씁니다. (crong9835@gmail.com → crong9835)
//
// 쓰이는 곳이 두 군데입니다.
//   1) 글을 저장할 때 (PostWrite.jsx) — DB 에 아예 이메일 전체를 넣지 않기 위해
//   2) 화면에 보여줄 때 (헤더, 목록, 상세)
//
// 2번이 남아 있는 이유는, 이 처리를 넣기 전에 저장된 글에는 아직 이메일 전체가
// 들어 있을 수 있기 때문입니다. @ 가 없는 값은 아래에서 그대로 돌려주므로
// 새 글과 옛 글이 똑같이 잘 나옵니다.
export function formatWriter(writer) {
  if (!writer) {
    return '알 수 없음';
  }

  const atIndex = writer.indexOf('@');
  if (atIndex === -1) {
    return writer; // @ 가 없는 값이면 손대지 않고 그대로
  }

  return writer.slice(0, atIndex);
}

// 저장된 날짜(created_at)를 2026.07.23 모양으로 바꿉니다.
export function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  const year = date.getFullYear();
  // getMonth() 는 0부터 세기 때문에 1을 더해야 실제 월이 됩니다. (0 = 1월)
  // padStart(2, '0') 는 한 자리 숫자 앞에 0을 붙여 두 자리로 맞춰줍니다. 7 → 07
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

// 화면에 보여줄 때 쓰는 변환 함수들을 모아둔 파일입니다.
// DB 에 저장된 값은 그대로 두고, 보여주는 순간에만 모양을 바꿉니다.

// 이메일에서 @ 앞부분만 잘라 작성자 이름으로 씁니다.
// 예) crong9835@gmail.com → crong9835
// 이메일 전체를 목록에 그대로 노출하지 않기 위한 처리입니다.
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

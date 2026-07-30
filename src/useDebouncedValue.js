import { useState, useEffect } from 'react';

// 값이 "잠잠해진 뒤에" 따라오는 값을 만들어주는 훅입니다.
//
// 무엇에 쓰나:
// 검색어를 한 글자 칠 때마다 DB 에 물어보면, '고양이' 를 치는 동안 조회가
// 세 번 나갑니다. 앞의 두 번(고, 고양)은 결과가 도착하자마자 버려지는데도
// 서버는 그만큼 일을 합니다. 게다가 응답이 순서대로 온다는 보장이 없어서,
// 늦게 출발한 '고양이' 결과가 먼저 도착하고 '고양' 결과가 나중에 도착하면
// 화면에 엉뚱한 목록이 남습니다.
//
// 그래서 "타이핑이 멈추고 delay 밀리초가 지나면" 그때의 값을 한 번만 내보냅니다.
//
// 쓰는 법
//   const 검색어 = (searchParams.get('q') || '').trim();
//   const 늦은검색어 = useDebouncedValue(검색어, 300);
//   → 입력칸은 검색어를 그대로 쓰고, DB 조회는 늦은검색어를 씁니다.
//     입력은 즉시 반응하고 조회만 한 박자 늦는 것이 핵심입니다.
export function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // delay 뒤에 값을 내보내라고 예약해 둡니다.
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    // useEffect 의 return 은 뒷정리 담당입니다. value 가 또 바뀌면 이 뒷정리가
    // 먼저 실행되어 방금 걸어둔 예약을 취소합니다.
    //
    // 이 한 줄이 이 훅의 전부입니다. 글자를 칠 때마다 예약이 취소되고 다시
    // 걸리므로, 손을 멈춰서 delay 동안 아무 일도 없을 때만 예약이 살아남아
    // 실행됩니다.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

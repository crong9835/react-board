// 목록 검색에 쓰는 값과 함수를 모아둔 파일입니다.
//
// 두 곳에서 함께 씁니다.
//   1) PostList.jsx   — 목록을 검색 조건에 맞게 조회할 때
//   2) PostDetail.jsx — 글을 지운 뒤 "검색 결과가 몇 개 남았는지" 셀 때
//
// 2번이 필요한 이유: 검색 결과 2페이지에서 글을 지웠는데 전체 글 개수로 마지막
// 페이지를 계산하면, 검색 결과는 1페이지뿐인데도 2페이지로 돌아가 404 가 뜹니다.

// 검색 대상 목록입니다.
// value 는 주소(?type=)에 들어가는 값이면서 posts 테이블의 컬럼 이름이기도 합니다.
// 두 값이 같아서 따로 변환하는 과정을 두지 않았습니다.
export const SEARCH_TYPES = [
  { value: 'title', label: '제목' },
  { value: 'writer', label: '작성자' },
];

export const DEFAULT_SEARCH_TYPE = 'title';

// 주소의 ?type= 값을 믿을 수 있는 값으로 바꿉니다.
// 주소는 사용자가 직접 고칠 수 있어서 ?type=content 처럼 아무 값이나 올 수 있는데,
// 그대로 컬럼 이름으로 쓰면 없는 컬럼을 조회하다 에러가 납니다.
// 목록에 없는 값이면 조용히 기본값(제목)으로 돌립니다.
export function normalizeSearchType(value) {
  const found = SEARCH_TYPES.find((type) => type.value === value);

  if (found) {
    return found.value;
  }

  return DEFAULT_SEARCH_TYPE;
}

// 검색 대상의 한글 이름을 돌려줍니다. (화면 안내 문구용)
export function getSearchTypeLabel(value) {
  const found = SEARCH_TYPES.find((type) => type.value === value);

  if (found) {
    return found.label;
  }

  return SEARCH_TYPES[0].label;
}

// 검색어에서 "아무 글자나"를 뜻하는 특수문자를 글자 그대로 찾도록 바꿉니다.
//
// 왜 필요한가:
// 검색은 ilike 라는 조건으로 하는데, 여기서 아래 세 글자는 특별한 뜻을 가집니다.
//   %   아무 글자가 몇 개든  (ilike 의 규칙)
//   _   아무 글자 한 개      (ilike 의 규칙)
//   *   %  와 같음           (Supabase 서버가 * 를 % 로 바꿔서 보냅니다)
//
// 그래서 검색어에 % 를 한 글자만 넣어도 조건이 "%%%" 가 되어 전체 글이 걸립니다.
// 실제로 확인해 본 결과, 글이 207개일 때 % / _ / * 셋 다 207개를 그대로 돌려줬습니다.
//
// 이 프로젝트는 회원가입의 닉네임 중복 검사에서 이미 같은 문제를 겪었습니다.
// 그때는 닉네임에 특수문자를 아예 못 쓰게 막아서 피했지만, 검색어는 무엇이든
// 칠 수 있어야 하므로 여기서는 막지 않고 "글자 그대로"로 바꿔줍니다.
//
// 바꾸는 방법은 앞에 백슬래시(\)를 붙이는 것입니다. \% 는 "특별한 뜻 없는 % 글자"입니다.
//
// 순서가 중요합니다. 백슬래시를 먼저 처리해야 합니다.
// 만약 % 를 먼저 \% 로 바꾸고 나서 백슬래시를 \\ 로 바꾸면,
// 방금 붙인 백슬래시까지 덩달아 늘어나 \\% 가 되어 버립니다.
export function escapeKeyword(keyword) {
  return keyword
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*');
}

// 만들던 조회 조건(query)에 검색 조건을 얹어서 돌려줍니다.
// 검색어가 없으면 아무것도 얹지 않으므로 전체 목록이 됩니다.
//
// 제목과 작성자를 한 번에 찾는 or() 를 쓰지 않은 이유:
// or() 는 조건을 'title.ilike.%가%,writer.ilike.%가%' 처럼 한 줄의 글자로 적는데,
// 여기서 쉼표와 괄호가 조건을 나누는 문법입니다. 검색어에 쉼표나 괄호가 들어가면
// 조건이 엉뚱하게 쪼개져 조회가 깨집니다. 한 번에 한 컬럼만 보면 그 위험이 없습니다.
export function applySearch(query, searchType, keyword) {
  if (!keyword) {
    return query;
  }

  const column = normalizeSearchType(searchType);

  return query.ilike(column, `%${escapeKeyword(keyword)}%`);
}

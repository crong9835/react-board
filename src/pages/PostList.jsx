import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import { formatWriter, formatDate } from '../format';
import {
  SEARCH_TYPES,
  normalizeSearchType,
  getSearchTypeLabel,
  applySearch,
} from '../search';
import NotFound from './NotFound';

// 한 페이지에 보여줄 글 개수. 이 숫자만 바꾸면 전체 페이지 수와 버튼도 따라옵니다.
// (상세 페이지의 POSTS_PER_PAGE 와 같은 값이어야 합니다.)
//
// 컴포넌트 밖에 둔 이유: 아래 useEffect 가 이 값을 쓰는데, 컴포넌트 안에 있으면
// "언제 다시 실행할지" 목록에 넣어야 하는 값처럼 보입니다. 밖에 있으면 렌더와
// 무관하게 늘 같은 값이라 그런 고민이 필요 없습니다.
const PAGE_SIZE = 15;

// 검색어 입력칸의 최대 글자수. 제목이 30자까지라 그보다 길 이유가 없습니다.
const KEYWORD_MAX = 30;

// 목록 화면입니다. 두 곳에서 씁니다.
//   /         유머 모음집 — 최신순
//   /popular  인기글      — 좋아요 많은 순
//
// 파일을 따로 만들지 않은 이유: 목록 줄, 페이지 나누기, 검색이 전부 같습니다.
// 새로 만들면 그대로 복사본이 되고, 나중에 목록을 고칠 때 두 군데를 고쳐야 합니다.
// 다른 것은 제목과 정렬 기준뿐이라 그 둘만 넘겨받습니다.
//
// 넘겨받는 값
// - heading : 화면 맨 위 제목. 기본값은 '유머 모음집'
// - sortBy  : 'latest'(기본) 또는 'likes'
function PostList({ heading = '유머 모음집', sortBy = 'latest' }) {
  const user = useUser();

  const isPopular = sortBy === 'likes';

  // 보고 있는 페이지 번호와 검색 조건을 useState 가 아니라
  // 주소(?page=2&type=title&q=고양이)에 둡니다.
  // 주소에 있으면 새로고침해도, 뒤로가기를 눌러도, 링크를 복사해서 보내도
  // 같은 화면이 나옵니다.
  const [searchParams, setSearchParams] = useSearchParams();

  // 이번 페이지에 보여줄 글 15개만 담습니다.
  // (예전에는 App 이 전체 글을 받아 props 로 넘겨줬습니다.)
  const [posts, setPosts] = useState([]);

  // 전체 글 개수. 페이지 버튼을 몇 개 만들지 계산하는 데 씁니다.
  // 전체 글을 받아오지 않으니 posts.length 로는 알 수 없어서, DB 에게 따로 물어봅니다.
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);

  // 주소에서 페이지 번호를 읽습니다. 주소는 사용자가 직접 고칠 수 있으므로
  // 없는 페이지 번호가 들어오면 목록 대신 404 화면을 보여줍니다.
  // 몰래 다른 페이지로 보내면 주소와 화면이 서로 다른 말을 하게 되기 때문입니다.
  const pageParam = searchParams.get('page');

  // 지금 화면에 적용된 검색 조건입니다. 주소에서 읽으므로 항상 화면과 일치합니다.
  // ?q 가 없으면 빈 문자열이 되고, 그러면 아래 조회에서 검색 조건을 얹지 않습니다.
  const keyword = (searchParams.get('q') || '').trim();
  const searchType = normalizeSearchType(searchParams.get('type'));
  const isSearching = keyword !== '';

  // ?page 가 아예 없으면(pageParam 이 null) 그냥 1페이지입니다.
  let page = 1;
  let isBadPageParam = false;

  if (pageParam !== null) {
    const pageNumber = Number(pageParam);

    // '3' 처럼 1 이상의 정수일 때만 제대로 된 페이지 번호로 봅니다.
    // 'abc'(Number 가 NaN 을 줌), '2.7'(소수), '0', '-3' 은 모두 없는 페이지입니다.
    if (Number.isInteger(pageNumber) && pageNumber >= 1) {
      page = pageNumber;
    } else {
      isBadPageParam = true;
    }
  }

  // 페이지가 바뀔 때마다 그 페이지 몫만 새로 받아옵니다.
  useEffect(() => {
    // 'abc' 같은 주소면 어차피 아래에서 404 화면을 보여주므로 조회하지 않습니다.
    if (isBadPageParam) {
      return;
    }

    async function fetchPage() {
      setLoading(true);

      // 앞에서 건너뛸 개수(offset). 2페이지면 15개를 건너뜁니다.
      const from = (page - 1) * PAGE_SIZE;

      // range 는 끝 번호를 "포함해서" 주기 때문에 1 을 빼야 정확히 15개가 옵니다.
      // (slice(15, 30) 은 30번을 포함하지 않지만, range(15, 30) 은 포함해 16개를 줍니다.)
      const to = from + PAGE_SIZE - 1;

      // 목록에 필요한 컬럼만 가져옵니다. 본문(content)은 목록에서 한 글자도 쓰지
      // 않는데 가장 긴 컬럼이라, 빼는 것만으로 받아오는 양이 크게 줄어듭니다.
      //
      // count: 'exact' 는 "조건에 맞는 전체 글이 몇 개인지도 같이 알려줘"라는 뜻입니다.
      // 여기서 "조건에 맞는" 이 중요합니다. 검색 중이면 검색에 걸린 개수를 세주므로,
      // 아래 페이지 버튼 계산은 전체 목록일 때와 똑같은 코드로 동작합니다.
      let query = supabase
        .from('posts')
        .select('id, title, writer, created_at, like_count', {
          count: 'exact',
        });

      if (isPopular) {
        // 인기글 — 좋아요 많은 순. 좋아요가 0인 글은 인기글이 아니므로 뺍니다.
        // 좋아요 개수가 같으면 최신 글이 위로 오게 두 번째 기준을 답니다.
        // (기준이 하나뿐이면 같은 개수끼리는 순서가 들쭉날쭉해집니다)
        query = query
          .gt('like_count', 0)
          .order('like_count', { ascending: false })
          .order('id', { ascending: false });
      } else {
        query = query.order('id', { ascending: false });
      }

      // 검색어가 있으면 여기서 조건이 하나 얹힙니다. 없으면 그대로 전체 목록입니다.
      query = applySearch(query, searchType, keyword);

      // range 는 항상 마지막에 붙입니다. "조건을 다 정한 뒤 그중 몇 번째부터
      // 몇 번째까지" 를 자르는 것이라 순서가 뒤바뀌면 읽기 어려워집니다.
      const { data, count, error } = await query.range(from, to);

      if (error) {
        console.log('에러:', error);
        setLoading(false); // 실패했어도 불러오기 시도는 끝났음
        return;
      }

      setPosts(data);
      setTotalCount(count);
      setLoading(false);
    }

    fetchPage();
    // 검색 조건이 바뀌면 목록도 다시 받아와야 하므로 함께 지켜봅니다.
  }, [page, isBadPageParam, searchType, keyword, isPopular]);

  let totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalPages === 0) {
    totalPages = 1; // 글이 하나도 없어도 1페이지는 있게
  }

  let isMissingPage = isBadPageParam;

  // 전체 페이지 수를 넘어선 번호(?page=231213022)도 없는 페이지입니다.
  // 단, 아직 불러오는 중이면 totalCount 가 0이라 totalPages 가 1이어서
  // 멀쩡한 3페이지도 없는 페이지로 보입니다. 그래서 다 불러온 뒤에만 따집니다.
  if (!loading && page > totalPages) {
    isMissingPage = true;
  }

  if (isMissingPage) {
    return <NotFound />;
  }

  // setSearchParams 는 방문 기록을 쌓기 때문에 뒤로가기가 이전 페이지로 돌아갑니다.
  //
  // 예전에는 { page: ... } 를 통째로 넘겼는데, 그러면 주소가 그 값만 남고 전부
  // 새로 쓰여서 검색어(?q=)가 사라졌습니다. 지금 주소를 복사해서 page 만 바꿔 끼우면
  // 나머지 조건은 그대로 남습니다.
  function goToPage(nextPage) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  }

  // 검색 폼에서 검색 버튼을 눌렀을 때. 폼이 들고 있던 값을 주소로 옮깁니다.
  function handleSearch(nextType, nextKeyword) {
    const nextParams = new URLSearchParams();

    // 검색어가 비어 있으면(공백만 친 경우 포함) 조건 없이 전체 목록으로 돌아갑니다.
    if (nextKeyword) {
      nextParams.set('type', nextType);
      nextParams.set('q', nextKeyword);
    }

    // page 를 일부러 넣지 않습니다. 없으면 1페이지이기 때문입니다.
    //
    // 지금 보던 페이지 번호를 그대로 두면 안 됩니다. 3페이지를 보다가 검색했는데
    // 결과가 1페이지뿐이면 없는 페이지가 되어 404 화면이 뜹니다.
    setSearchParams(nextParams);
  }

  // "검색 해제" — 조건을 전부 비워 전체 목록 1페이지로 돌아갑니다.
  function handleSearchReset() {
    setSearchParams(new URLSearchParams());
  }

  // 마지막 페이지는 글이 PAGE_SIZE 보다 적을 수 있습니다. 그대로 두면 목록 높이가
  // 줄어들어 페이지를 옮길 때마다 화면이 출렁이므로, 모자란 만큼 빈 줄로 채웁니다.
  // 페이지가 하나뿐이면 옮겨 다닐 일이 없으므로 채우지 않습니다.
  const blankRowNumbers = [];
  if (totalPages > 1) {
    for (let i = posts.length; i < PAGE_SIZE; i++) {
      blankRowNumbers.push(i);
    }
  }

  // 페이지 버튼에 쓸 번호 목록 만들기.
  // 전체 페이지를 다 만들면 글이 많아졌을 때 버튼이 화면을 뒤덮으므로,
  // 지금 보고 있는 페이지를 가운데 두고 앞뒤로 몇 개씩만 만듭니다.
  // 예) 7페이지에 있으면 5 6 7 8 9
  const PAGE_BUTTON_COUNT = 5;

  // 현재 페이지가 가운데 오도록 시작 번호를 잡습니다. (7페이지면 7 - 2 = 5부터)
  let firstPageNumber = page - Math.floor(PAGE_BUTTON_COUNT / 2);

  // 1페이지 근처면 앞으로 더 갈 곳이 없으므로 1부터 시작합니다.
  if (firstPageNumber < 1) {
    firstPageNumber = 1;
  }

  let lastPageNumber = firstPageNumber + PAGE_BUTTON_COUNT - 1;

  // 마지막 페이지 근처라 뒤가 모자라면, 그만큼 앞으로 당겨서 개수를 채웁니다.
  if (lastPageNumber > totalPages) {
    lastPageNumber = totalPages;
    firstPageNumber = lastPageNumber - PAGE_BUTTON_COUNT + 1;

    // 당기다가 1보다 작아졌으면(전체 페이지가 5개 미만) 1로 맞춥니다.
    if (firstPageNumber < 1) {
      firstPageNumber = 1;
    }
  }

  const pageNumbers = [];
  for (let i = firstPageNumber; i <= lastPageNumber; i++) {
    pageNumbers.push(i);
  }

  // 목록 자리에 셋 중 하나를 보여줍니다. 아래 화면에서 조건을 겹쳐 쓰지 않도록
  // 여기서 미리 이름을 붙여둡니다.
  //
  // "불러오는 중"은 보여줄 게 아무것도 없는 첫 진입에만 띄웁니다. 페이지를 옮기는
  // 중에도 띄우면 목록이 사라졌다 나타나면서 화면 높이가 출렁이므로, 그때는 새 글이
  // 도착할 때까지 이전 페이지 줄을 그대로 두었다가 한 번에 바꿉니다.
  const isFirstLoad = loading && posts.length === 0;
  const isEmpty = !loading && totalCount === 0;
  const hasPosts = posts.length > 0;

  // 상세 페이지로 넘길 주소에 붙일 부분입니다.
  //
  // 지금 보고 있는 목록 상태(페이지 번호 + 검색 조건)를 통째로 실어 보냅니다.
  // 상세의 "목록으로" 가 이걸 그대로 받아 제자리로 돌아옵니다.
  //
  // 예전에는 `?page=${page}` 라고 페이지 번호만 적었습니다. 그때는 그것뿐이라
  // 문제가 없었지만, 검색 조건이 생기면서 하나씩 적는 방식은 조건이 늘 때마다
  // 여기를 고쳐야 합니다. 주소를 통째로 넘기면 나중에 무엇이 늘어도 그대로입니다.
  //
  // page 를 다시 넣어주는 이유: 1페이지에서는 주소에 ?page 가 아예 없는데,
  // 그러면 상세에서 돌아올 때 몇 페이지였는지 알 수 없습니다.
  const detailParams = new URLSearchParams(searchParams);
  detailParams.set('page', String(page));

  // 어느 목록에서 들어왔는지 함께 실어 보냅니다.
  // 상세의 "목록으로" 가 이 값을 보고 인기글로 돌아갈지 정합니다.
  if (isPopular) {
    detailParams.set('from', 'popular');
  }

  const detailQuery = detailParams.toString();

  return (
    <div>
      <div className="list-header">
        <h2>{heading}</h2>
        <Link to="/write" className="btn btn-primary">
          글쓰기
        </Link>
      </div>

      {/* key 에 지금 주소의 검색 조건을 넣어둡니다.
          key 가 바뀌면 React 는 그 컴포넌트를 고쳐 쓰지 않고 새로 만듭니다.
          그래야 뒤로가기나 "검색 해제" 로 주소가 먼저 바뀌었을 때 입력칸도
          새 값으로 다시 시작합니다. (자세한 이유는 SearchForm 위 주석 참고) */}
      <SearchForm
        key={`${searchType}|${keyword}`}
        initialType={searchType}
        initialKeyword={keyword}
        onSearch={handleSearch}
      />

      {/* 검색 중일 때만 나오는 안내 줄.
          아직 첫 조회가 끝나지 않았으면 totalCount 가 0이라 "0건" 으로 잘못 보이므로
          결과가 도착한 뒤에 보여줍니다. */}
      {isSearching && !isFirstLoad && (
        <p className="search-info">
          <span>
            {getSearchTypeLabel(searchType)}에 <strong>{keyword}</strong>
            (이)가 들어간 글 {totalCount}건
          </span>
          <button
            type="button"
            className="search-reset"
            onClick={handleSearchReset}
          >
            검색 해제
          </button>
        </p>
      )}

      {isFirstLoad && <p className="empty">불러오는 중...</p>}

      {/* 보여줄 글이 없는 경우입니다. 검색 중인지 아닌지에 따라 안내가 달라야 합니다.
          검색 결과가 없는 것을 "등록된 글이 없습니다" 라고 하면, 글이 207개 있는데도
          게시판이 텅 빈 것처럼 읽힙니다. */}
      {isEmpty && isSearching && (
        <div className="empty">
          <p>검색 결과가 없습니다.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSearchReset}
          >
            전체 목록 보기
          </button>
        </div>
      )}

      {/* 인기글이 비어 있는 것은 글이 없다는 뜻이 아니라, 아직 아무도 좋아요를
          누르지 않았다는 뜻입니다. "등록된 글이 없습니다" 라고 하면 글이 200개
          있는데도 게시판이 텅 빈 것처럼 읽힙니다. */}
      {isEmpty && !isSearching && isPopular && (
        <div className="empty">
          <p>아직 좋아요를 받은 글이 없습니다.</p>
          <Link to="/" className="btn btn-primary">
            전체 글 보기
          </Link>
        </div>
      )}

      {isEmpty && !isSearching && !isPopular && (
        <div className="empty">
          <p>등록된 글이 없습니다.</p>
          {/* 로그인하지 않았다면 눌러도 로그인 페이지로 튕기므로 보여주지 않습니다. */}
          {user && (
            <Link to="/write" className="btn btn-primary">
              첫 글 쓰기
            </Link>
          )}
        </div>
      )}

      {hasPosts && (
        <>
          <ul className="post-list">
            {/* 각 열이 무엇인지 알려주는 머리글 줄 (클릭 대상이 아님) */}
            <li className="post-list-head">
              <span className="col-title">제목</span>
              <span className="col-writer">작성자</span>
              <span className="col-date">작성일</span>
            </li>

            {posts.map((post) => (
              <li key={post.id}>
                {/* 지금 보고 있는 목록 상태(페이지 번호 + 검색 조건)를 실어 보냅니다.
                    상세 페이지의 "목록으로" 가 이걸 읽어 제자리로 돌아옵니다. */}
                <Link to={`/post/${post.id}?${detailQuery}`}>
                  <span className="col-title">
                    {post.title}
                    {/* 좋아요가 하나라도 있으면 제목 옆에 개수를 붙입니다.
                        0인 글까지 ♥ 0 을 달면 목록이 지저분해집니다. */}
                    {post.like_count > 0 && (
                      <span className="post-likes">♥ {post.like_count}</span>
                    )}
                  </span>
                  <span className="col-writer">
                    {formatWriter(post.writer)}
                  </span>
                  <span className="col-date">{formatDate(post.created_at)}</span>
                </Link>
              </li>
            ))}

            {/* 높이만 채우는 빈 줄입니다. 글 줄과 같은 규칙(.post-list-blank)을 써서
                높이를 똑같이 맞추고, 안에는 눈에 안 보이는 공백 한 칸만 둡니다. */}
            {blankRowNumbers.map((number) => (
              <li key={`blank-${number}`} className="post-list-blank">
                <span className="col-title">&nbsp;</span>
              </li>
            ))}
          </ul>

          <div className="pagination">
            <button
              type="button"
              className="btn"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
            >
              이전
            </button>

            {pageNumbers.map((number) => {
              // 지금 보고 있는 페이지면 진하게 표시
              let buttonClass = 'btn';
              if (number === page) {
                buttonClass = 'btn btn-primary';
              }

              return (
                <button
                  key={number}
                  type="button"
                  className={buttonClass}
                  onClick={() => goToPage(number)}
                >
                  {number}
                </button>
              );
            })}

            <button
              type="button"
              className="btn"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 검색 폼입니다. 목록(PostList)에서 떼어낸 이유가 두 가지 있습니다.
//
// 1) 타이핑하는 동안에는 주소를 건드리지 않기 위해서입니다.
//    글자 하나 칠 때마다 주소를 바꾸면 그때마다 DB 를 조회하고 방문 기록도
//    그만큼 쌓여서, 뒤로가기를 스무 번 눌러야 이전 화면으로 갑니다.
//    입력 중인 값은 이 안에만 두고, 검색 버튼을 눌렀을 때 한 번만 밖으로 알립니다.
//
// 2) useState 의 초기값은 컴포넌트가 "처음 나타날 때" 한 번만 쓰이기 때문입니다.
//    뒤로가기나 "검색 해제" 로 주소가 먼저 바뀌어도, 이 값이 이미 만들어진 뒤라면
//    입력칸은 옛 검색어를 그대로 붙잡고 있습니다. 목록은 전체 글을 보여주는데
//    입력칸에는 '고양이' 가 남아 화면과 입력칸이 서로 다른 말을 하게 됩니다.
//    쓰는 쪽에서 key 를 주소의 검색 조건으로 걸어두면, 주소가 바뀔 때 이 컴포넌트가
//    통째로 새로 만들어지면서 초기값이 다시 들어갑니다.
//
//    PostEdit.jsx 가 수정 폼을 따로 떼어둔 것도 같은 이유입니다.
function SearchForm({ initialType, initialKeyword, onSearch }) {
  const [type, setType] = useState(initialType);
  const [keyword, setKeyword] = useState(initialKeyword);

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(type, keyword.trim());
  }

  // select 와 input 모두 aria-label 을 답니다.
  // select 는 화면에 "제목/작성자" 글자가 보이지만 그것은 지금 고른 값이지,
  // 이 칸이 무엇을 고르는 칸인지 알려주는 이름은 아니기 때문입니다.
  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <select
        className="search-select"
        aria-label="검색 대상"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        {SEARCH_TYPES.map((searchType) => (
          <option key={searchType.value} value={searchType.value}>
            {searchType.label}
          </option>
        ))}
      </select>

      <input
        className="search-input"
        type="text"
        placeholder="검색어를 입력하세요"
        aria-label="검색어"
        value={keyword}
        maxLength={KEYWORD_MAX}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <button type="submit" className="btn">
        검색
      </button>
    </form>
  );
}

export default PostList;

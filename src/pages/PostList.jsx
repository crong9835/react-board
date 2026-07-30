import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import { formatWriter, formatDate } from '../format';
import NotFound from './NotFound';

// 한 페이지에 보여줄 글 개수. 이 숫자만 바꾸면 전체 페이지 수와 버튼도 따라옵니다.
// (상세 페이지의 POSTS_PER_PAGE 와 같은 값이어야 합니다.)
//
// 컴포넌트 밖에 둔 이유: 아래 useEffect 가 이 값을 쓰는데, 컴포넌트 안에 있으면
// "언제 다시 실행할지" 목록에 넣어야 하는 값처럼 보입니다. 밖에 있으면 렌더와
// 무관하게 늘 같은 값이라 그런 고민이 필요 없습니다.
const PAGE_SIZE = 15;

function PostList() {
  const user = useUser();

  // 보고 있는 페이지 번호를 useState 가 아니라 주소(?page=2)에 둡니다.
  // 주소에 있으면 새로고침해도, 뒤로가기를 눌러도, 링크를 복사해서 보내도
  // 같은 페이지가 나옵니다.
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
      const { data, count, error } = await supabase
        .from('posts')
        .select('id, title, writer, created_at', { count: 'exact' })
        .order('id', { ascending: false })
        .range(from, to);

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
  }, [page, isBadPageParam]);

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
  function goToPage(nextPage) {
    setSearchParams({ page: String(nextPage) });
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

  return (
    <div>
      <div className="list-header">
        <h2>유머 모음집</h2>
        <Link to="/write" className="btn btn-primary">
          글쓰기
        </Link>
      </div>

      {isFirstLoad && <p className="empty">불러오는 중...</p>}

      {isEmpty && (
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
                {/* 지금 보고 있는 페이지 번호를 주소에 실어 보냅니다.
                    상세 페이지의 "목록으로" 가 이 번호를 읽어 제자리로 돌아옵니다. */}
                <Link to={`/post/${post.id}?page=${page}`}>
                  <span className="col-title">{post.title}</span>
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

export default PostList;

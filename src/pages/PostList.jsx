import { Link, useSearchParams } from 'react-router-dom';
import { useUser } from '../AuthContext';
import { formatWriter, formatDate } from '../format';

function PostList({ posts, loading }) {
  const user = useUser(); // 로그인한 사용자 (없으면 null)

  // 보고 있는 페이지 번호를 컴포넌트 안(useState)이 아니라 주소(?page=2)에 둡니다.
  // 주소에 있으면 새로고침해도, 뒤로가기를 눌러도, 링크를 복사해서 보내도
  // 같은 페이지가 나옵니다.
  const [searchParams, setSearchParams] = useSearchParams();

  // 한 페이지에 보여줄 글 개수입니다. 이 숫자만 바꾸면 목록 길이가 바뀌고,
  // 전체 페이지 수와 페이지 버튼도 알아서 따라 계산됩니다.
  const pageSize = 15;

  // 전체 페이지 수 = 글 개수 ÷ pageSize, 나머지가 있으면 한 페이지 더
  let totalPages = Math.ceil(posts.length / pageSize);
  if (totalPages === 0) {
    totalPages = 1; // 글이 하나도 없어도 1페이지는 있게
  }

  // 주소에서 페이지 번호를 읽습니다.
  // ?page 가 아예 없으면 Number(null) 이 0 이 되고, ?page=abc 면 NaN 이 됩니다.
  // 둘 다 거짓 값이라 || 1 이 받아서 1페이지가 됩니다.
  //
  // Math.floor 로 소수점을 잘라내는 이유:
  // ?page=2.7 처럼 소수를 직접 입력하면 2.7 이 그대로 통과해서
  // 목록을 자르는 위치와 페이지 버튼 번호가 소수가 되어버립니다.
  // 내림해서 2페이지로 만들어 둡니다. (NaN 은 내림해도 NaN 이라 || 1 이 그대로 받습니다)
  let page = Math.floor(Number(searchParams.get('page'))) || 1;

  // ?page=999 처럼 범위를 벗어난 값이 들어오면 빈 목록이 나오므로 보정합니다.
  if (page < 1) {
    page = 1;
  }
  if (page > totalPages) {
    page = totalPages;
  }

  // 페이지 번호를 주소에 적어 넣습니다.
  // setSearchParams 는 방문 기록을 쌓기 때문에 뒤로가기가 이전 페이지로 돌아갑니다.
  function goToPage(nextPage) {
    setSearchParams({ page: String(nextPage) });
  }

  // 이번 페이지에 보여줄 글만 잘라내기
  const firstIndex = (page - 1) * pageSize;
  const lastIndex = page * pageSize;
  const currentPosts = posts.slice(firstIndex, lastIndex);

  // 페이지 버튼에 쓸 번호 목록 만들기.
  //
  // 전체 페이지를 다 만들면 글이 많아졌을 때 버튼이 화면을 뒤덮습니다.
  // (1000개면 버튼 100개) 그래서 지금 보고 있는 페이지를 가운데 두고
  // 앞뒤로 몇 개씩만 만듭니다. 예) 7페이지에 있으면 5 6 7 8 9
  const PAGE_BUTTON_COUNT = 5;

  // 현재 페이지가 가운데 오도록 시작 번호를 잡습니다.
  // Math.floor(5 / 2) 는 2 이므로, 7페이지면 5부터 시작합니다.
  let firstPageNumber = page - Math.floor(PAGE_BUTTON_COUNT / 2);

  // 1페이지 근처면 앞으로 더 갈 곳이 없으므로 1부터 시작합니다.
  // (이걸 끝 번호보다 먼저 해야 버튼 개수가 모자라지 않습니다)
  if (firstPageNumber < 1) {
    firstPageNumber = 1;
  }

  let lastPageNumber = firstPageNumber + PAGE_BUTTON_COUNT - 1;

  // 마지막 페이지 근처라 뒤가 모자라면, 그만큼 앞으로 당겨서 개수를 채웁니다.
  if (lastPageNumber > totalPages) {
    lastPageNumber = totalPages;
    firstPageNumber = lastPageNumber - PAGE_BUTTON_COUNT + 1;

    // 당기다가 1보다 작아졌으면(전체 페이지가 5개 미만인 경우) 1로 맞춥니다.
    if (firstPageNumber < 1) {
      firstPageNumber = 1;
    }
  }

  const pageNumbers = [];
  for (let i = firstPageNumber; i <= lastPageNumber; i++) {
    pageNumbers.push(i);
  }

  return (
    <div>
      <div className="list-header">
        {/* 헤더 로고가 이미 "게시판"이라 여기서는 "글 목록"으로 구분합니다. */}
        <h2>글 목록</h2>
        <Link to="/write" className="btn btn-primary">
          글쓰기
        </Link>
      </div>

      {loading ? (
        <p className="empty">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <div className="empty">
          <p>등록된 글이 없습니다.</p>
          {/* 로그인한 사람에게만 글쓰기로 가는 안내를 보여줍니다.
              로그인하지 않았다면 눌러도 로그인 페이지로 튕기므로 소용이 없습니다. */}
          {user ? (
            <Link to="/write" className="btn btn-primary">
              첫 글 쓰기
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          {/* 글 한 줄은 제목 | 작성자 | 작성일 가로 3열입니다.
              한 줄에 한 글씩만 차지하도록 낮게 잡아 목록이 길어지지 않게 합니다. */}
          <ul className="post-list">
            {/* 각 열이 무엇인지 알려주는 머리글 줄 (클릭 대상이 아님) */}
            <li className="post-list-head">
              <span className="col-title">제목</span>
              <span className="col-writer">작성자</span>
              <span className="col-date">작성일</span>
            </li>

            {currentPosts.map((post) => (
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
          </ul>

          <div className="pagination">
            {/* 이전 버튼: 1페이지면 못 누르게 */}
            <button
              type="button"
              className="btn"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
            >
              이전
            </button>

            {/* 페이지 번호 버튼들 */}
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

            {/* 다음 버튼: 마지막 페이지면 못 누르게 */}
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

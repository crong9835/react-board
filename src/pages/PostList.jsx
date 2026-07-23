import { Link, useSearchParams } from 'react-router-dom';
import { formatWriter, formatDate } from '../format';

function PostList({ posts, loading }) {
  // 보고 있는 페이지 번호를 컴포넌트 안(useState)이 아니라 주소(?page=2)에 둡니다.
  // 주소에 있으면 새로고침해도, 뒤로가기를 눌러도, 링크를 복사해서 보내도
  // 같은 페이지가 나옵니다.
  const [searchParams, setSearchParams] = useSearchParams();
  const pageSize = 10;

  // 전체 페이지 수 = 글 개수 ÷ 10, 나머지가 있으면 한 페이지 더
  let totalPages = Math.ceil(posts.length / pageSize);
  if (totalPages === 0) {
    totalPages = 1; // 글이 하나도 없어도 1페이지는 있게
  }

  // 주소에서 페이지 번호를 읽습니다.
  // ?page 가 아예 없으면 Number(null) 이 0 이 되고, ?page=abc 면 NaN 이 됩니다.
  // 둘 다 거짓 값이라 || 1 이 받아서 1페이지가 됩니다.
  let page = Number(searchParams.get('page')) || 1;

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

  // 페이지 버튼에 쓸 번호 목록 만들기 → [1, 2, 3 ...]
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div>
      <div className="list-header">
        <h2>목록 페이지</h2>
        <Link to="/write" className="btn">
          글쓰기
        </Link>
      </div>

      {loading ? (
        <p className="empty">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="empty">등록된 글이 없습니다.</p>
      ) : (
        <>
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

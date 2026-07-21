import { useState } from 'react';
import { Link } from 'react-router-dom';

function PostList({ posts }) {
  // 지금 보고 있는 페이지 번호 (처음엔 1페이지)
  const [page, setPage] = useState(1);

  const pageSize = 10; // 한 페이지에 보여줄 글 개수

  // 전체 페이지 수 = 글 개수 ÷ 10, 나머지가 있으면 한 페이지 더
  let totalPages = Math.ceil(posts.length / pageSize);
  if (totalPages === 0) {
    totalPages = 1; // 글이 하나도 없어도 1페이지는 있게
  }

  // 이번 페이지에 보여줄 글만 잘라내기
  const firstIndex = (page - 1) * pageSize; // 몇 번째 글부터
  const lastIndex = page * pageSize; // 몇 번째 글까지
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

      {posts.length === 0 ? (
        <p className="empty">등록된 글이 없습니다.</p>
      ) : (
        <>
          <ul className="post-list">
            {currentPosts.map((post) => (
              <li key={post.id}>
                <Link to={`/post/${post.id}`}>{post.title}</Link>
              </li>
            ))}
          </ul>

          <div className="pagination">
            {/* 이전 버튼: 1페이지면 못 누르게 */}
            <button
              type="button"
              className="btn"
              onClick={() => setPage(page - 1)}
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
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              );
            })}

            {/* 다음 버튼: 마지막 페이지면 못 누르게 */}
            <button
              type="button"
              className="btn"
              onClick={() => setPage(page + 1)}
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

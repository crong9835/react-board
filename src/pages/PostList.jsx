import { Link } from 'react-router-dom';

function PostList({ posts }) {
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
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link to={`/post/${post.id}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PostList;

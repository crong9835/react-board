import { useParams, useNavigate } from 'react-router-dom';

function PostDetail({ posts, setPosts }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const post = posts.find((post) => post.id === Number(id));

  function handleDelete() {
    setPosts(posts.filter((p) => p.id !== Number(id)));
    navigate('/');
  }

  if (!post) {
    return <p className="empty">글을 찾을 수 없습니다.</p>;
  }

  return (
    <div className="detail">
      <h2>{post.title}</h2>
      <p className="writer">작성자: {post.writer}</p>
      <p className="content">{post.content}</p>

      <div className="actions">
        <button className="btn" onClick={() => navigate(`/edit/${id}`)}>
          수정하기
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>
          삭제하기
        </button>
        <button className="btn" onClick={() => navigate('/')}>
          목록으로
        </button>
      </div>
    </div>
  );
}

export default PostDetail;

import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';

function PostDetail({ posts, setPosts }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser(); // 로그인한 사용자 (없으면 null)

  const post = posts.find((post) => post.id === Number(id));

  async function handleDelete() {
    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      console.log('삭제 에러:', error);
      return;
    }

    setPosts(posts.filter((post) => post.id !== Number(id)));
    navigate('/');
  }

  if (!post) {
    return <p className="empty">글을 찾을 수 없습니다.</p>;
  }

  // 로그인한 사람이 이 글의 작성자인지 확인
  const isOwner = user && post.user_id === user.id;

  return (
    <div className="detail">
      <h2>{post.title}</h2>
      <p className="writer">작성자: {post.writer}</p>
      <p className="content">{post.content}</p>

      <div className="actions">
        {/* 왼쪽: 목록으로 (뒤로가기) */}
        <button className="btn" onClick={() => navigate('/')}>
          목록으로
        </button>

        {/* 오른쪽: 본인 글일 때만 보이는 수정/삭제 */}
        {isOwner && (
          <div className="actions-right">
            <button className="btn" onClick={() => navigate(`/edit/${id}`)}>
              수정하기
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              삭제하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostDetail;

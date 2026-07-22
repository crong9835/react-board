import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import Modal from '../components/Modal';

function PostDetail({ posts, setPosts, loading }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser(); // 로그인한 사용자 (없으면 null)

  // 삭제 확인 모달이 열려 있는지 여부
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const post = posts.find((post) => post.id === Number(id));

  // 실제 삭제 처리 (모달에서 "삭제"를 눌렀을 때 실행)
  async function handleDelete() {
    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      console.log('삭제 에러:', error);
      setIsConfirmOpen(false);
      return;
    }

    setPosts(posts.filter((post) => post.id !== Number(id)));
    navigate('/');
  }

  // 아직 목록을 불러오는 중이면 "없음"이 아니라 "불러오는 중"으로 안내
  if (loading) {
    return <p className="empty">불러오는 중...</p>;
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
            <button
              className="btn btn-danger"
              onClick={() => setIsConfirmOpen(true)}
            >
              삭제하기
            </button>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 (취소 / 삭제 두 버튼) */}
      <Modal
        isOpen={isConfirmOpen}
        message="정말 삭제하시겠습니까?"
        confirmText="삭제"
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default PostDetail;

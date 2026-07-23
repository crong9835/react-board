import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import { formatWriter, formatDate } from '../format';
import Modal from '../components/Modal';

function PostDetail({ posts, setPosts, loading }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser(); // 로그인한 사용자 (없으면 null)

  // 삭제 확인 모달("정말 삭제하시겠습니까?")이 열려 있는지 여부
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // 삭제가 실패했을 때 보여줄 안내 모달
  // 확인 모달과 별개입니다. 확인 모달을 닫고 이 모달을 대신 띄웁니다.
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const post = posts.find((post) => post.id === Number(id));

  // 확인 모달을 닫고 안내 모달을 여는 함수
  function showAlert(message) {
    setIsConfirmOpen(false);
    setAlertMessage(message);
    setIsAlertOpen(true);
  }

  // 실제 삭제 처리 (모달에서 "삭제"를 눌렀을 때 실행)
  async function handleDelete() {
    // 수정과 마찬가지로 .select() 를 붙여야 실제로 몇 건이 지워졌는지 알 수 있습니다.
    // 붙이지 않으면 남의 글이라 DB(RLS)가 막아도 error 는 null 이라
    // 지워지지 않았는데 지워진 것처럼 보입니다.
    //
    // .eq('user_id', ...) 는 DB 의 RLS 와 겹치는 조건이지만,
    // "내 글만 지운다"는 의도를 코드에도 드러내기 위해 함께 적습니다.
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', Number(id))
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.log('삭제 에러:', error);
      showAlert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // 돌아온 행이 없다 = DB가 "당신 글이 아니다"라며 막았다는 뜻
    if (data.length === 0) {
      showAlert('본인이 작성한 글만 삭제할 수 있습니다.');
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
      <p className="writer">
        작성자: {formatWriter(post.writer)} · 작성일:{' '}
        {formatDate(post.created_at)}
      </p>
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

      {/* 삭제가 실패했을 때 띄우는 안내 모달 (확인 버튼 하나) */}
      <Modal
        isOpen={isAlertOpen}
        message={alertMessage}
        onClose={() => setIsAlertOpen(false)}
      />
    </div>
  );
}

export default PostDetail;

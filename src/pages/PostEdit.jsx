import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import Modal from '../components/Modal';

// 이 파일에는 컴포넌트가 두 개 있습니다.
//
// 1) PostEdit     — 글을 보여줘도 되는 상황인지 먼저 확인만 합니다.
// 2) PostEditForm — 실제 수정 폼. 글(post)이 확실히 있을 때만 화면에 나타납니다.
//
// 왜 나눴는가:
// useState 의 초기값은 그 컴포넌트가 "처음 나타날 때" 딱 한 번만 쓰입니다.
// 한 컴포넌트로 두면, 새로고침 직후에는 글 목록이 아직 비어 있어서
// 제목/내용이 빈 문자열('')로 굳어버리고, 나중에 글이 도착해도 폼은 빈 채로 남습니다.
// 폼을 따로 떼어 두면 글이 도착한 뒤에야 폼이 처음 나타나므로 초기값이 제대로 들어갑니다.

function PostEdit({ posts, setPosts, loading }) {
  const { id } = useParams();
  const user = useUser(); // 로그인한 사용자 (없으면 null)

  const post = posts.find((post) => post.id === Number(id));

  // 아직 목록을 불러오는 중이면 "없음"이 아니라 "불러오는 중"으로 안내
  if (loading) {
    return <p className="empty">불러오는 중...</p>;
  }

  if (!post) {
    return <p className="empty">글을 찾을 수 없습니다.</p>;
  }

  // 남의 글이면 수정 폼을 아예 보여주지 않고 상세 페이지로 되돌립니다.
  // DB(RLS)가 이미 막고 있으므로 보안이 아니라, 어차피 못 고칠 폼을
  // 보여주지 않기 위한 처리입니다.
  // replace 를 쓰면 이 주소가 방문 기록에 남지 않아 뒤로가기가 꼬이지 않습니다.
  if (!user || post.user_id !== user.id) {
    return <Navigate to={`/post/${post.id}`} replace />;
  }

  return <PostEditForm post={post} posts={posts} setPosts={setPosts} />;
}

function PostEditForm({ post, posts, setPosts }) {
  const navigate = useNavigate();
  const user = useUser();

  // 이 컴포넌트는 post 가 확실히 있을 때만 나타나므로 초기값을 바로 쓸 수 있습니다.
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  // 모달을 닫은 뒤 상세 페이지로 이동할지 여부 (수정 성공했을 때만 true)
  const [goToDetailAfterClose, setGoToDetailAfterClose] = useState(false);

  const TITLE_MAX = 30;
  const CONTENT_MAX = 500;

  function openModal(message) {
    setModalMessage(message);
    setIsModalOpen(true);
  }

  // 모달을 닫을 때 실행. 수정 성공이었으면 상세 페이지로 이동합니다.
  function handleModalClose() {
    setIsModalOpen(false);
    if (goToDetailAfterClose) {
      navigate(`/post/${post.id}`);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      openModal('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // 제목과 내용만 수정 (작성자는 바뀌지 않음)
    //
    // .select() 를 꼭 붙여야 합니다.
    // 붙이지 않으면 서버가 "204 No Content" 로 답해서 실제로 몇 건이 고쳐졌는지
    // 알 수 없습니다. 남의 글이라 DB(RLS)가 막아도 그건 "에러"가 아니라
    // "0건 수정"이라서 error 는 null 로 옵니다. 그래서 아래 data.length 검사가
    // 없으면 실패를 성공이라고 안내하게 됩니다.
    //
    // .eq('user_id', ...) 는 DB 의 RLS 와 겹치는 조건이지만,
    // "내 글만 고친다"는 의도를 코드에도 드러내기 위해 함께 적습니다.
    const { data, error } = await supabase
      .from('posts')
      .update({ title: title, content: content })
      .eq('id', post.id)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.log('수정 에러:', error);
      openModal('수정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // 돌아온 행이 없다 = DB가 "당신 글이 아니다"라며 막았다는 뜻
    if (data.length === 0) {
      openModal('본인이 작성한 글만 수정할 수 있습니다.');
      return;
    }

    // DB 가 실제로 저장한 행(data[0])을 그대로 넣습니다.
    // 직접 만든 값이 아니라 저장된 값이라, 화면과 DB 가 어긋날 수 없습니다.
    setPosts(posts.map((p) => (p.id === post.id ? data[0] : p)));

    setGoToDetailAfterClose(true);
    openModal('수정되었습니다.');
  }

  return (
    <div>
      <h2>글 수정 페이지</h2>

      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="제목"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="char-count">
          {title.length} / {TITLE_MAX}
        </p>

        <textarea
          placeholder="내용"
          value={content}
          maxLength={CONTENT_MAX}
          onChange={(e) => setContent(e.target.value)}
        />
        <p className="char-count">
          {content.length} / {CONTENT_MAX}
        </p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            취소
          </button>

          <button type="submit" className="btn btn-primary">
            수정
          </button>
        </div>
      </form>

      {/* 안내용 모달 (확인 버튼 하나) — 수정 성공이면 확인 시 상세 페이지로 이동 */}
      <Modal
        isOpen={isModalOpen}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </div>
  );
}

export default PostEdit;

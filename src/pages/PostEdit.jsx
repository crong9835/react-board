import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import Modal from '../components/Modal';

function PostEdit({ posts, setPosts }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const post = posts.find((post) => post.id === Number(id));

  const [title, setTitle] = useState(post ? post.title : '');
  const [content, setContent] = useState(post ? post.content : '');

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
      navigate(`/post/${id}`);
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
    const { data, error } = await supabase
      .from('posts')
      .update({ title: title, content: content })
      .eq('id', Number(id))
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
    setPosts(posts.map((p) => (p.id === Number(id) ? data[0] : p)));

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

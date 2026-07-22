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

    if (title.length > TITLE_MAX) {
      openModal(`제목은 ${TITLE_MAX}자 이하로 입력해주세요.`);
      return;
    }
    if (content.length > CONTENT_MAX) {
      openModal(`내용은 ${CONTENT_MAX}자 이하로 입력해주세요.`);
      return;
    }

    // 제목과 내용만 수정 (작성자는 바뀌지 않음)
    const { error } = await supabase
      .from('posts')
      .update({ title, content })
      .eq('id', Number(id));

    if (error) {
      console.log('수정 에러:', error);
      return;
    }

    setPosts(
      posts.map((p) =>
        p.id === Number(id) ? { ...p, title: title, content: content } : p,
      ),
    );

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

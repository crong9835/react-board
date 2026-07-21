import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import Modal from '../components/Modal';

function PostWrite({ posts, setPosts }) {
  const navigate = useNavigate();
  const user = useUser(); // 로그인한 사용자
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  // 모달을 닫은 뒤 목록 페이지로 이동할지 여부 (등록 성공했을 때만 true)
  const [goToListAfterClose, setGoToListAfterClose] = useState(false);

  const TITLE_MAX = 30; // 제목 최대 글자수
  const CONTENT_MAX = 500; // 내용 최대 글자수

  // 안내 문구를 모달로 띄우는 함수
  function openModal(message) {
    setModalMessage(message);
    setIsModalOpen(true);
  }

  // 모달을 닫을 때 실행. 등록 성공이었으면 목록 페이지로 이동합니다.
  function handleModalClose() {
    setIsModalOpen(false);
    if (goToListAfterClose) {
      navigate('/');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // 제목/내용이 비어있으면 등록 막기
    if (!title.trim() || !content.trim()) {
      openModal('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // 글자수 제한 검증
    if (title.length > TITLE_MAX) {
      openModal(`제목은 ${TITLE_MAX}자 이하로 입력해주세요.`);
      return;
    }
    if (content.length > CONTENT_MAX) {
      openModal(`내용은 ${CONTENT_MAX}자 이하로 입력해주세요.`);
      return;
    }

    // 작성자는 로그인한 사용자로 자동 저장
    // user_id 를 같이 저장해야 나중에 "본인 글"인지 확인할 수 있음
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title,
          content,
          writer: user.email,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log('에러:', error);
      return;
    }

    setPosts([data, ...posts]);

    // 확인을 누르면 목록 페이지로 이동하도록 표시하고, 성공 안내 모달을 띄웁니다.
    setGoToListAfterClose(true);
    openModal('등록되었습니다.');
  }

  return (
    <div>
      <h2>글쓰기 페이지</h2>

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
            등록
          </button>
        </div>
      </form>

      {/* 안내용 모달 (확인 버튼 하나) — 등록 성공이면 확인 시 목록 페이지로 이동 */}
      <Modal
        isOpen={isModalOpen}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </div>
  );
}

export default PostWrite;

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

  const TITLE_MAX = 30;
  const CONTENT_MAX = 500;

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

    if (!title.trim() || !content.trim()) {
      openModal('제목과 내용을 모두 입력해주세요.');
      return;
    }

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
      console.log('등록 에러:', error);

      // 42501 = DB 의 RLS 정책이 이 저장을 거부했다는 뜻입니다.
      // 여기서는 "시간당 10개" 작성 빈도 제한에 걸린 경우입니다.
      // (수정·삭제와 달리 INSERT 거부는 조용히 넘어가지 않고 에러로 옵니다.)
      if (error.code === '42501') {
        openModal('글을 너무 자주 작성하셨습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        openModal('등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      return;
    }

    setPosts([data, ...posts]);

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

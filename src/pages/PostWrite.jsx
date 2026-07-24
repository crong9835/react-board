import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser, useNickname } from '../AuthContext';
import Modal from '../components/Modal';

function PostWrite({ posts, setPosts }) {
  const navigate = useNavigate();
  const user = useUser();
  const nickname = useNickname();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  // 모달을 닫은 뒤 목록 페이지로 이동할지 여부 (등록 성공했을 때만 true)
  const [goToListAfterClose, setGoToListAfterClose] = useState(false);

  // true 인 동안 등록 버튼을 막습니다. 빠르게 두 번 눌러 같은 글이
  // 두 개 저장되는 것을 방지하기 위한 값입니다.
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);

    // user_id 를 같이 저장해야 나중에 "본인 글"인지 확인할 수 있습니다.
    //
    // writer 에는 이메일이 아니라 닉네임을 저장합니다.
    // 글 목록은 로그인하지 않은 사람도 읽을 수 있어서(RLS 의 조회 정책이 누구나 허용),
    // 이메일을 저장해 두면 개발자도구 네트워크 탭에서 가입자 이메일을 그대로 볼 수
    // 있습니다. 화면에서만 가려서는 막을 수 없고, 애초에 DB 에 넣지 않아야 합니다.
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title,
          content,
          writer: nickname,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    // 실패했을 때 다시 시도할 수 있어야 하므로 성공·실패를 가리지 않고 풉니다.
    setIsSubmitting(false);

    if (error) {
      console.log('등록 에러:', error);

      // 42501 = DB 의 RLS 정책이 이 저장을 거부했다는 뜻으로,
      // 여기서는 "시간당 10개" 작성 빈도 제한에 걸린 경우입니다.
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
      <h2>글쓰기</h2>

      <form className="form" onSubmit={handleSubmit}>
        {/* aria-label 은 화면에는 안 보이지만 스크린 리더가 읽어주는 이름입니다.
            placeholder 는 타이핑을 시작하면 사라지므로 접근성을 위해 함께 답니다. */}
        <input
          type="text"
          placeholder="제목"
          aria-label="제목"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="char-count">
          {title.length} / {TITLE_MAX}
        </p>

        <textarea
          placeholder="내용"
          aria-label="내용"
          value={content}
          maxLength={CONTENT_MAX}
          onChange={(e) => setContent(e.target.value)}
        />
        <p className="char-count">
          {content.length} / {CONTENT_MAX}
        </p>
        <div className="form-actions">
          {/* navigate(-1) 은 "브라우저 뒤로가기"와 같아서, 주소창에 /write 를 직접
              쳐서 들어온 경우 앞 기록이 다른 사이트라 거기로 나가버립니다.
              갈 곳을 목록으로 못 박아 두면 어떤 경로로 들어왔든 목록으로 갑니다. */}
          <button type="button" className="btn" onClick={() => navigate('/')}>
            취소
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '등록'}
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

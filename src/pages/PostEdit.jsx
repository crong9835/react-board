import {
  useNavigate,
  useParams,
  useSearchParams,
  Navigate,
} from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import Modal from '../components/Modal';

// 이 파일에는 컴포넌트가 두 개 있습니다.
//   1) PostEdit     — 글을 보여줘도 되는 상황인지 확인만 합니다.
//   2) PostEditForm — 실제 수정 폼. 글(post)이 확실히 있을 때만 나타납니다.
//
// 나눈 이유: useState 의 초기값은 컴포넌트가 "처음 나타날 때" 한 번만 쓰입니다.
// 한 컴포넌트로 두면 새로고침 직후에는 글 목록이 아직 비어 있어서 제목/내용이
// 빈 문자열('')로 굳어버리고, 나중에 글이 도착해도 폼은 빈 채로 남습니다.
// 폼을 떼어 두면 글이 도착한 뒤에야 폼이 나타나므로 초기값이 제대로 들어갑니다.

function PostEdit({ posts, setPosts, loading }) {
  // 주소에서 꺼낸 값은 항상 문자열('3')이라, 숫자로 바꿔둬야 글의 id 와 비교됩니다.
  const { id } = useParams();
  const postId = Number(id);

  const user = useUser();

  const post = posts.find((item) => item.id === postId);

  // 상세 페이지에서 실려 온 페이지 번호. 수정을 마치고 상세로 돌아갈 때
  // 그대로 달고 가야 거기서 "목록으로"를 눌렀을 때 보던 페이지로 돌아갑니다.
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;

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
  const detailPath = `/post/${post.id}?page=${page}`;

  if (!user || post.user_id !== user.id) {
    return <Navigate to={detailPath} replace />;
  }

  return (
    <PostEditForm
      post={post}
      posts={posts}
      setPosts={setPosts}
      detailPath={detailPath}
    />
  );
}

function PostEditForm({ post, posts, setPosts, detailPath }) {
  const navigate = useNavigate();
  const user = useUser();

  // post 가 확실히 있을 때만 나타나는 컴포넌트라 초기값을 바로 쓸 수 있습니다.
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  // 모달을 닫은 뒤 상세 페이지로 이동할지 여부 (수정 성공했을 때만 true)
  const [goToDetailAfterClose, setGoToDetailAfterClose] = useState(false);

  // true 인 동안 수정 버튼을 막아 같은 요청이 두 번 나가는 것을 막습니다.
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      navigate(detailPath);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      openModal('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // .select() 를 꼭 붙여야 합니다. 붙이지 않으면 서버가 "204 No Content" 로 답해
    // 몇 건이 고쳐졌는지 알 수 없습니다. 남의 글이라 DB(RLS)가 막아도 그건 에러가
    // 아니라 "0건 수정"이라 error 는 null 로 오고, 아래 data.length 검사가 없으면
    // 실패를 성공이라고 안내하게 됩니다.
    //
    // .eq('user_id', ...) 는 RLS 와 겹치는 조건이지만,
    // "내 글만 고친다"는 의도를 코드에도 드러내기 위해 함께 적습니다.
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('posts')
      .update({ title: title, content: content })
      .eq('id', post.id)
      .eq('user_id', user.id)
      .select();

    // 실패했을 때 다시 시도할 수 있어야 하므로 성공·실패를 가리지 않고 풉니다.
    setIsSubmitting(false);

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
    const updatedPost = data[0];
    setPosts(posts.map((item) => (item.id === post.id ? updatedPost : item)));

    setGoToDetailAfterClose(true);
    openModal('수정되었습니다.');
  }

  return (
    <div>
      <h2>글 수정</h2>

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
          {/* navigate(-1) 은 "브라우저 뒤로가기"와 같아서, 주소창에 /edit/3 을 직접
              쳐서 들어온 경우 앞 기록이 다른 사이트라 거기로 나가버립니다.
              갈 곳을 상세 페이지로 못 박아 두면 어떤 경로로 들어왔든 상세로 갑니다.
              detailPath 에는 보던 페이지 번호(?page=2)도 들어 있습니다. */}
          <button
            type="button"
            className="btn"
            onClick={() => navigate(detailPath)}
          >
            취소
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '수정 중...' : '수정'}
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

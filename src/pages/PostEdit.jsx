import {
  useNavigate,
  useParams,
  useSearchParams,
  Navigate,
} from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import { uploadPostImage, removePostImage, getImageUrl } from '../postImage';
import Modal from '../components/Modal';
import ImagePicker from '../components/ImagePicker';

// 이 파일에는 컴포넌트가 두 개 있습니다.
//   1) PostEdit     — 글을 불러오고, 보여줘도 되는 상황인지 확인합니다.
//   2) PostEditForm — 실제 수정 폼. 글(post)이 확실히 있을 때만 나타납니다.
//
// 나눈 이유: useState 의 초기값은 컴포넌트가 "처음 나타날 때" 한 번만 쓰입니다.
// 한 컴포넌트로 두면 글이 아직 도착하지 않은 동안 제목/내용이 빈 문자열('')로
// 굳어버리고, 나중에 글이 도착해도 폼은 빈 채로 남습니다.
// 폼을 떼어 두면 글이 도착한 뒤에야 폼이 나타나므로 초기값이 제대로 들어갑니다.

function PostEdit() {
  // 주소에서 꺼낸 값은 항상 문자열('3')이라, 숫자로 바꿔둬야 글의 id 와 비교됩니다.
  const { id } = useParams();
  const postId = Number(id);

  const user = useUser();

  // 상세 페이지에서 실려 온 목록 상태(페이지 번호 + 검색 조건)입니다.
  // 수정을 마치고 상세로 돌아갈 때 그대로 달고 가야, 거기서 "목록으로"를 눌렀을 때
  // 보던 페이지와 검색 결과로 돌아갑니다.
  const [searchParams] = useSearchParams();

  // 고칠 글 하나만 담습니다. 못 찾았으면 계속 null 입니다.
  // (예전에는 App 이 받아둔 전체 글 배열에서 find 로 찾아 썼습니다.)
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      // /edit/abc 처럼 숫자가 아닌 주소면 postId 가 NaN 입니다.
      // 그대로 조회하면 DB 가 에러를 내므로, 물어보지 않고 "없는 글"로 처리합니다.
      if (!Number.isInteger(postId)) {
        setLoading(false);
        return;
      }

      // 폼 초기값으로 쓸 title·content 와, 본인 글인지 볼 user_id 가 필요합니다.
      // maybeSingle() 은 행이 없으면 에러가 아니라 data 를 null 로 줍니다.
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (error) {
        console.log('조회 에러:', error);
        setLoading(false);
        return;
      }

      setPost(data);
      setLoading(false);
    }

    fetchPost();
  }, [postId]);

  // 아직 불러오는 중이면 "없음"이 아니라 "불러오는 중"으로 안내
  if (loading) {
    return <p className="empty">불러오는 중...</p>;
  }

  if (!post) {
    return <p className="empty">글을 찾을 수 없습니다.</p>;
  }

  // 남의 글이면 수정 폼을 아예 보여주지 않고 상세 페이지로 되돌립니다.
  // DB(RLS)가 이미 막고 있으므로 보안이 아니라, 어차피 못 고칠 폼을
  // 보여주지 않기 위한 처리입니다.
  //
  // 조건이 하나도 없으면(주소창으로 /edit/3 을 직접 친 경우) 물음표를 붙이지 않습니다.
  const query = searchParams.toString();
  const detailPath = query
    ? `/post/${post.id}?${query}`
    : `/post/${post.id}`;

  if (!user || post.user_id !== user.id) {
    return <Navigate to={detailPath} replace />;
  }

  return <PostEditForm post={post} detailPath={detailPath} />;
}

function PostEditForm({ post, detailPath }) {
  const navigate = useNavigate();
  const user = useUser();

  // post 가 확실히 있을 때만 나타나는 컴포넌트라 초기값을 바로 쓸 수 있습니다.
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  // 사진은 상태가 두 개 필요합니다. "안 건드림 / 바꿈 / 뺌" 세 가지를
  // 구분해야 하는데, 값 하나로는 "뺌" 과 "안 건드림" 이 똑같이 null 이라
  // 구분되지 않기 때문입니다.
  //
  //   imageFile      새로 고른 파일 (없으면 null)
  //   isImageRemoved "사진 빼기" 를 눌렀는지
  //
  //   안 건드림 → imageFile = null,  isImageRemoved = false → 원래 경로 그대로
  //   바꿈      → imageFile = 파일                          → 새로 올린 경로
  //   뺌        → imageFile = null,  isImageRemoved = true  → null
  const [imageFile, setImageFile] = useState(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);

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

    // 저장할 사진 경로를 정합니다. 기본은 "안 건드림"(원래 경로 그대로)입니다.
    let nextImagePath = post.image_path;

    if (imageFile) {
      // 바꿈 — 새 사진을 먼저 올려야 넣을 경로가 정해집니다.
      // 옛 사진은 여기서 지우지 않습니다. 아래 수정이 실패하면 그 글은 여전히
      // 옛 사진을 가리키고 있는데, 먼저 지워버리면 사진만 사라진 글이 됩니다.
      const uploaded = await uploadPostImage(imageFile, user.id);

      if (uploaded.error) {
        setIsSubmitting(false);
        openModal(uploaded.error);
        return;
      }

      nextImagePath = uploaded.path;
    } else if (isImageRemoved) {
      // 뺌 — 경로를 비웁니다. 파일은 아래 수정이 성공한 뒤에 지웁니다.
      nextImagePath = null;
    }

    const { data, error } = await supabase
      .from('posts')
      .update({ title: title, content: content, image_path: nextImagePath })
      .eq('id', post.id)
      .eq('user_id', user.id)
      .select();

    // 실패했을 때 다시 시도할 수 있어야 하므로 성공·실패를 가리지 않고 풉니다.
    setIsSubmitting(false);

    // 수정이 이뤄지지 않은 두 경우를 함께 처리합니다.
    // 방금 새 사진을 올렸다면, 그 사진은 어느 글도 가리키지 않는 파일이 되므로
    // 도로 지웁니다. (imageFile 이 있을 때만 새로 올린 것입니다)
    function cleanUpUploadedImage() {
      if (imageFile) {
        removePostImage(nextImagePath);
      }
    }

    if (error) {
      console.log('수정 에러:', error);
      cleanUpUploadedImage();
      openModal('수정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // 돌아온 행이 없다 = DB가 "당신 글이 아니다"라며 막았다는 뜻
    if (data.length === 0) {
      cleanUpUploadedImage();
      openModal('본인이 작성한 글만 수정할 수 있습니다.');
      return;
    }

    // 여기까지 왔으면 저장이 끝났습니다. 이제 쓰이지 않게 된 옛 사진을 지웁니다.
    // 경로가 바뀌었을 때만 지워야 합니다. 사진을 안 건드렸으면 두 값이 같은데,
    // 그때 지우면 방금 저장한 글의 사진을 지우는 셈이 됩니다.
    if (post.image_path && post.image_path !== nextImagePath) {
      removePostImage(post.image_path);
    }

    // 고쳐진 내용을 화면에 다시 심어줄 필요가 없습니다.
    // 상세 페이지가 열릴 때 스스로 DB 를 다시 읽으므로 저장된 값이 그대로 나옵니다.
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

        {/* 사진 첨부 (선택).
            existingUrl 은 "지금 저장돼 있는 사진" 입니다. 빼기를 눌렀으면
            빈 문자열을 넘겨 미리보기에서 사라지게 합니다. 아직 저장 전이라
            DB 의 image_path 는 그대로지만, 화면에는 저장 후의 모습을 보여주는
            것이 맞습니다. */}
        <ImagePicker
          file={imageFile}
          existingUrl={isImageRemoved ? '' : getImageUrl(post.image_path)}
          onSelect={(file) => {
            setImageFile(file);

            // 빼기를 눌렀다가 마음을 바꿔 새 사진을 고른 경우입니다.
            // 표시를 풀어두지 않으면 "뺌" 과 "바꿈" 이 겹쳐 헷갈립니다.
            // (저장 로직은 imageFile 을 먼저 보므로 결과는 같지만,
            //  상태가 사실과 다르게 남아 있으면 나중에 고칠 때 발목을 잡습니다)
            setIsImageRemoved(false);
          }}
          onRemove={() => {
            setImageFile(null);
            setIsImageRemoved(true);
          }}
          disabled={isSubmitting}
        />

        <div className="form-actions">
          {/* navigate(-1) 은 "브라우저 뒤로가기"와 같아서, 주소창에 /edit/3 을 직접
              쳐서 들어온 경우 앞 기록이 다른 사이트라 거기로 나가버립니다.
              갈 곳을 상세 페이지로 못 박아 두면 어떤 경로로 들어왔든 상세로 갑니다.
              detailPath 에는 보던 페이지 번호와 검색 조건도 들어 있습니다. */}
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

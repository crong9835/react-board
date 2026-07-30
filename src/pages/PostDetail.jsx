import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import { formatWriter, formatDate } from '../format';
import Modal from '../components/Modal';

// 한 페이지에 보여주는 글 개수입니다. PostList 의 PAGE_SIZE 와 같아야 합니다.
// (삭제 후 돌아갈 페이지 번호를 올바르게 계산하는 데 씁니다.)
const POSTS_PER_PAGE = 15;

function PostDetail() {
  // 주소에서 꺼낸 값은 항상 문자열('3')이라, 숫자로 바꿔둬야 글의 id 와 비교됩니다.
  const { id } = useParams();
  const postId = Number(id);

  const navigate = useNavigate();
  const user = useUser();

  // 목록에서 넘어올 때 주소에 실려 온 페이지 번호 (예: /post/3?page=2 → 2)
  // 주소창으로 상세에 바로 들어와 ?page 가 없으면 1페이지로 돌아갑니다.
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const listPath = `/?page=${page}`;

  // 이 글 하나만 담습니다. 못 찾았으면 계속 null 입니다.
  // (예전에는 App 이 받아둔 전체 글 배열에서 find 로 찾아 썼습니다.)
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // 삭제 확인 모달("정말 삭제하시겠습니까?")
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // 삭제가 실패했을 때 보여줄 안내 모달. 확인 모달을 닫고 이걸 대신 띄웁니다.
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // true 인 동안 삭제 요청이 진행 중입니다.
  // 확인 모달의 "삭제" 버튼을 빠르게 두 번 눌러도 요청이 한 번만 나가게 막습니다.
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      // /post/abc 처럼 숫자가 아닌 주소면 postId 가 NaN 입니다.
      // 그대로 조회하면 DB 가 에러를 내므로, 물어보지 않고 "없는 글"로 처리합니다.
      if (!Number.isInteger(postId)) {
        setLoading(false);
        return;
      }

      // 여기서는 본문(content)과 작성자 확인용 user_id 까지 다 필요하므로 전 컬럼을
      // 가져옵니다. 대신 목록 전체가 아니라 이 글 한 줄뿐입니다.
      //
      // single() 은 행이 없으면 에러로 취급하지만, maybeSingle() 은 없으면 data 를
      // null 로 줍니다. 지워진 글 주소로 들어온 것은 에러가 아니라 "없는 글"이므로
      // maybeSingle() 이 맞습니다.
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

  function showAlert(message) {
    setIsConfirmOpen(false);
    setAlertMessage(message);
    setIsAlertOpen(true);
  }

  // 모달에서 "삭제"를 눌렀을 때 실행
  async function handleDelete() {
    // 이미 삭제가 진행 중이면 아무 것도 하지 않습니다. (중복 클릭 방지)
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);

    // .select() 를 붙여야 실제로 몇 건이 지워졌는지 알 수 있습니다.
    // 붙이지 않으면 남의 글이라 DB(RLS)가 막아도 error 는 null 이라
    // 지워지지 않았는데 지워진 것처럼 보입니다.
    //
    // .eq('user_id', ...) 는 RLS 와 겹치는 조건이지만,
    // "내 글만 지운다"는 의도를 코드에도 드러내기 위해 함께 적습니다.
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.log('삭제 에러:', error);
      // 다시 시도할 수 있도록 진행 중 표시를 풀어줍니다.
      setIsDeleting(false);
      showAlert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // 돌아온 행이 없다 = DB가 "당신 글이 아니다"라며 막았다는 뜻
    if (data.length === 0) {
      setIsDeleting(false);
      showAlert('본인이 작성한 글만 삭제할 수 있습니다.');
      return;
    }

    // 삭제로 글이 줄면 보던 페이지가 사라질 수 있습니다.
    // 예: 글 16개(2페이지)에서 2페이지의 마지막 한 개를 지우면 이제 1페이지뿐인데,
    // 그대로 ?page=2 로 돌아가면 "없는 페이지"라 404 화면이 뜹니다.
    // 그래서 남은 글이 몇 개인지 DB 에게 물어 마지막 페이지를 다시 계산합니다.
    //
    // head: true 는 "개수만 세고 글 내용은 보내지 마라"는 뜻입니다.
    const { count, error: countError } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true });

    // 개수를 못 받아왔으면 페이지 번호를 따질 근거가 없으니 1페이지로 보냅니다.
    if (countError || count === null) {
      console.log('개수 조회 에러:', countError);
      navigate('/');
      return;
    }

    const lastPage = Math.max(1, Math.ceil(count / POSTS_PER_PAGE));
    const safePage = Math.min(page, lastPage);

    // 성공하면 목록으로 이동하므로 isDeleting 은 되돌리지 않아도 됩니다.
    // 목록은 열릴 때 스스로 다시 조회하므로, 지운 글은 자연히 사라져 있습니다.
    navigate(`/?page=${safePage}`);
  }

  // 아직 불러오는 중이면 "없음"이 아니라 "불러오는 중"으로 안내
  if (loading) {
    return <p className="empty">불러오는 중...</p>;
  }

  if (!post) {
    return <p className="empty">글을 찾을 수 없습니다.</p>;
  }

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
        {/* 왼쪽: 목록으로 — 보고 있던 페이지 번호를 그대로 달고 돌아갑니다 */}
        <button className="btn" onClick={() => navigate(listPath)}>
          목록으로
        </button>

        {/* 오른쪽: 본인 글일 때만 보이는 수정/삭제 */}
        {isOwner && (
          <div className="actions-right">
            <button
              className="btn"
              onClick={() => navigate(`/edit/${id}?page=${page}`)}
            >
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

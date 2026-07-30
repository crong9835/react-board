import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser, useNickname } from '../AuthContext';
import { formatDate } from '../format';
import Modal from './Modal';

// 댓글 한 개의 최대 글자수
const CONTENT_MAX = 200;

// 한 번에 보여줄 댓글 개수. "이전 댓글 더 보기"를 누를 때마다 이만큼씩 늘어납니다.
const COMMENTS_PER_LOAD = 20;

// 글 하나에 달린 댓글 목록과 입력칸입니다. 상세 페이지(PostDetail) 아래에 붙습니다.
//
// 넘겨받는 값
// - postId : 어느 글의 댓글인지. 숫자입니다.
function Comments({ postId }) {
  const user = useUser();
  const nickname = useNickname();

  // 지금 화면에 보이는 댓글들. 전부가 아니라 최신 loadedCount 개입니다.
  const [comments, setComments] = useState([]);

  // 이 글의 전체 댓글 개수. 제목 옆 숫자와 "더 보기" 버튼을 계산하는 데 씁니다.
  // 전부 받아오지 않으니 comments.length 로는 알 수 없어 DB 에게 따로 물어봅니다.
  const [totalCount, setTotalCount] = useState(0);

  // 몇 개까지 받아올지. "이전 댓글 더 보기"를 누르면 20씩 늘어나고,
  // 그러면 아래 useEffect 가 다시 돌아 그만큼 받아옵니다.
  const [loadedCount, setLoadedCount] = useState(COMMENTS_PER_LOAD);

  const [loading, setLoading] = useState(true);

  // 입력칸에 쓰고 있는 내용
  const [content, setContent] = useState('');

  // true 인 동안 등록 버튼을 막습니다. 빠르게 두 번 눌러 같은 댓글이
  // 두 개 저장되는 것을 방지합니다. (글쓰기 화면과 같은 방식)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 삭제 확인 모달에서 "어느 댓글을 지울지" 기억해 두는 값입니다.
  // null 이면 모달이 닫힌 상태입니다.
  //
  // 글 삭제(PostDetail)는 지울 대상이 지금 보고 있는 글 하나뿐이라 true/false 로
  // 충분했지만, 댓글은 여러 개가 나열되어 있어 어느 것인지도 함께 기억해야 합니다.
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 안내 모달에 띄울 문구. 빈 문자열이면 닫힌 상태입니다.
  const [alertMessage, setAlertMessage] = useState('');

  // 댓글을 못 불러왔는지 여부입니다.
  //
  // 이 값이 없으면 조회가 실패해도 comments 가 빈 배열이라 "첫 댓글을 남겨보세요"
  // 가 뜹니다. 댓글이 없는 것과 못 불러온 것은 다른 상황인데 같은 말을 하게 되고,
  // 사용자는 남의 댓글이 안 보이는 줄도 모른 채 댓글을 답니다.
  const [hasLoadError, setHasLoadError] = useState(false);

  // 댓글을 다시 읽어야 할 때 1씩 올리는 숫자입니다. 값 자체에는 뜻이 없고,
  // "바뀌었다"는 사실만으로 아래 useEffect 를 다시 돌리는 것이 목적입니다.
  //
  // 왜 이런 방법을 쓰나: 조회 함수를 useEffect 밖에 두고 등록·삭제 뒤에 직접
  // 부르는 방법도 있지만, 그러면 그 함수를 useEffect 가 지켜봐야 해서
  // 화면이 다시 그려질 때마다 새 함수로 보여 조회가 끝없이 돌게 됩니다.
  // 조회하는 코드는 useEffect 안에 그대로 두고(목록·상세 페이지와 같은 방식),
  // 다시 읽고 싶을 때 이 숫자만 올리면 그 고민이 사라집니다.
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    async function fetchComments() {
      // /post/abc 처럼 숫자가 아닌 주소로 들어온 경우입니다.
      // 그대로 조회하면 DB 가 에러를 내므로 물어보지 않습니다.
      if (!Number.isInteger(postId)) {
        setLoading(false);
        return;
      }

      // DB 에는 최신 것부터 달라고 하고(내림차순), 화면에 그릴 때 뒤집습니다.
      //
      // 왜 이렇게 하나:
      // 화면에는 오래된 댓글이 위에 있어야 합니다. 위에서 아래로 읽어 내려가는
      // 대화에 가깝기 때문입니다. 하지만 나눠서 받을 때 기준은 최신 쪽이어야 합니다.
      // 오래된 것부터 20개를 받으면 댓글을 새로 써도 그건 맨 뒤에 있어서
      // 화면에 안 나타납니다. 자기가 쓴 댓글이 안 보이는 것만큼 이상한 것이 없습니다.
      // 최신 20개를 받으면 방금 쓴 댓글은 항상 그 안에 들어 있습니다.
      //
      // count: 'exact' 는 "조건에 맞는 전체 개수도 같이 알려줘"라는 뜻입니다.
      // range 로 20개만 받아도 count 에는 전체 개수가 들어옵니다.
      const { data, count, error } = await supabase
        .from('comments')
        .select('id, user_id, writer, content, created_at', { count: 'exact' })
        .eq('post_id', postId)
        .order('id', { ascending: false })
        .range(0, loadedCount - 1);

      if (error) {
        console.log('댓글 조회 에러:', error);
        setHasLoadError(true);
        setLoading(false); // 실패했어도 불러오기 시도는 끝났음
        return;
      }

      // 받은 것은 최신순이므로 뒤집어서 오래된 순으로 만듭니다.
      // reverse() 는 원본 배열을 직접 뒤집으므로, 복사본을 만들어 뒤집습니다.
      const oldestFirst = [...data].reverse();

      // 다시 시도해 성공한 경우이므로 실패 표시를 지웁니다.
      setHasLoadError(false);
      setComments(oldestFirst);
      setTotalCount(count);
      setLoading(false);
    }

    fetchComments();
    // loadedCount 가 늘면("더 보기") 그만큼 다시 받아옵니다.
  }, [postId, reloadCount, loadedCount]);

  // 댓글을 다시 읽어오게 합니다. 등록·삭제가 끝난 뒤에 부릅니다.
  //
  // 지금 값에 1을 더하는 대신 함수를 넘기는 이유: 등록과 삭제가 거의 동시에
  // 끝나면 둘 다 "내가 봤을 때의 값"에 1을 더해 같은 숫자를 쓰게 되어,
  // 두 번 올렸는데 한 번만 올라간 것이 됩니다. 함수를 넘기면 React 가
  // 그때의 최신 값을 넣어주므로 그런 일이 없습니다.
  function reloadComments() {
    setReloadCount((count) => count + 1);
  }

  // 안내 모달을 띄웁니다. 삭제 확인 모달이 열려 있었다면 닫고 이걸 대신 보여줍니다.
  // 모달 두 개가 겹쳐 뜨는 것을 막기 위해서입니다.
  function showAlert(message) {
    setDeleteTargetId(null);
    setAlertMessage(message);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // 공백만 친 경우까지 걸러냅니다.
    if (!content.trim()) {
      showAlert('댓글 내용을 입력해주세요.');
      return;
    }

    // 이미 등록이 진행 중이면 아무 것도 하지 않습니다. (중복 클릭 방지)
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);

    // user_id 를 같이 저장해야 나중에 "본인 댓글"인지 확인할 수 있습니다.
    // writer 에는 이메일이 아니라 닉네임을 저장합니다. (이유는 comments.sql 참고)
    //
    // 저장된 행을 돌려받을 필요가 없어 .select() 를 붙이지 않습니다.
    // 아래에서 목록을 통째로 다시 읽으므로 새 댓글이 자연히 포함됩니다.
    const { error } = await supabase.from('comments').insert([
      {
        post_id: postId,
        user_id: user.id,
        writer: nickname,
        content: content,
      },
    ]);

    // 실패했을 때 다시 시도할 수 있어야 하므로 성공·실패를 가리지 않고 풉니다.
    setIsSubmitting(false);

    if (error) {
      console.log('댓글 등록 에러:', error);

      // 42501 = DB 의 RLS 정책이 이 저장을 거부했다는 뜻으로,
      // 여기서는 "시간당 30개" 작성 빈도 제한에 걸린 경우입니다.
      if (error.code === '42501') {
        showAlert('댓글을 너무 자주 작성하셨습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        showAlert('댓글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      return;
    }

    setContent('');

    // 목록을 손으로 손질하지 않고 다시 읽습니다.
    // 이 게시판이 등록·수정·삭제 뒤에 쓰는 방식과 같습니다. 화면과 DB 가
    // 어긋날 여지가 없어집니다.
    reloadComments();
  }

  // 삭제 확인 모달에서 "삭제"를 눌렀을 때 실행
  async function handleDelete() {
    // 이미 삭제가 진행 중이면 아무 것도 하지 않습니다. (중복 클릭 방지)
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);

    // .select() 를 꼭 붙여야 합니다. 붙이지 않으면 남의 댓글이라 DB(RLS)가 막아도
    // error 는 null 이라, 지워지지 않았는데 지워진 것처럼 보입니다.
    // 돌아온 행 수를 세는 것이 유일하게 확실한 확인 방법입니다.
    //
    // .eq('user_id', ...) 는 RLS 와 겹치는 조건이지만,
    // "내 댓글만 지운다"는 의도를 코드에도 드러내기 위해 함께 적습니다.
    const { data, error } = await supabase
      .from('comments')
      .delete()
      .eq('id', deleteTargetId)
      .eq('user_id', user.id)
      .select();

    setIsDeleting(false);

    if (error) {
      console.log('댓글 삭제 에러:', error);
      showAlert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // 돌아온 행이 없다 = DB가 "당신 댓글이 아니다"라며 막았다는 뜻
    if (data.length === 0) {
      showAlert('본인이 작성한 댓글만 삭제할 수 있습니다.');
      return;
    }

    setDeleteTargetId(null);
    reloadComments();
  }

  // 아직 안 받아온 오래된 댓글이 몇 개 남았는지.
  // 0보다 크면 "이전 댓글 더 보기" 버튼을 보여줍니다.
  const remainingCount = totalCount - comments.length;

  // "불러오는 중"은 보여줄 게 아무것도 없는 첫 진입에만 띄웁니다.
  // "더 보기"로 다시 받는 중에도 띄우면 이미 읽고 있던 댓글이 사라졌다 나타나므로,
  // 그때는 이전 댓글을 그대로 두었다가 새로 도착하면 한 번에 바꿉니다.
  // (목록 페이지가 페이지를 옮길 때 쓰는 방식과 같습니다)
  const isFirstLoad = loading && comments.length === 0;

  return (
    <div className="comments">
      <h3 className="comments-title">
        댓글 <span className="comments-count">{totalCount}</span>
      </h3>

      {isFirstLoad && <p className="empty">불러오는 중...</p>}

      {!loading && hasLoadError && (
        <p className="empty">댓글을 불러오지 못했습니다.</p>
      )}

      {!loading && !hasLoadError && comments.length === 0 && (
        <p className="empty">첫 댓글을 남겨보세요.</p>
      )}

      {/* 오래된 댓글을 더 받아오는 버튼입니다. 목록 위에 둡니다.
          더 받으면 위쪽으로 이어지기 때문입니다. */}
      {remainingCount > 0 && (
        <button
          type="button"
          className="comment-more"
          onClick={() => setLoadedCount(loadedCount + COMMENTS_PER_LOAD)}
          disabled={loading}
        >
          {loading ? '불러오는 중...' : `이전 댓글 더 보기 (${remainingCount}개)`}
        </button>
      )}

      {comments.length > 0 && (
        <ul className="comment-list">
          {comments.map((comment) => {
            // 내 댓글일 때만 삭제 버튼을 보여줍니다.
            // 실제 차단은 DB(RLS)가 하므로 이것은 보안이 아니라,
            // 어차피 지우지 못할 버튼을 보여주지 않기 위한 처리입니다.
            const isOwner = user && comment.user_id === user.id;

            return (
              <li key={comment.id} className="comment">
                <div className="comment-head">
                  {/* writer 에는 닉네임만 들어갑니다. 이 표는 새로 만든 것이라
                      옛 이메일이 섞여 있을 일이 없어 그대로 보여줍니다.
                      (목록·상세의 formatWriter 는 이메일이 저장돼 있던 시절의
                       옛 글을 위한 처리입니다) */}
                  <span className="comment-writer">{comment.writer}</span>
                  <span className="comment-date">
                    {formatDate(comment.created_at)}
                  </span>

                  {isOwner && (
                    <button
                      type="button"
                      className="comment-delete"
                      onClick={() => setDeleteTargetId(comment.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>

                {/* 댓글은 줄바꿈을 그대로 살려서 보여줍니다.
                    (CSS 의 white-space: pre-wrap 이 그 일을 합니다) */}
                <p className="comment-content">{comment.content}</p>
              </li>
            );
          })}
        </ul>
      )}

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            placeholder="댓글을 입력하세요"
            aria-label="댓글 내용"
            value={content}
            maxLength={CONTENT_MAX}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="comment-form-actions">
            <p className="char-count">
              {content.length} / {CONTENT_MAX}
            </p>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '등록 중...' : '댓글 등록'}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-login">
          <Link to="/login">로그인</Link> 후 댓글을 작성할 수 있습니다.
        </p>
      )}

      {/* 삭제 확인 모달 (취소 / 삭제 두 버튼) */}
      <Modal
        isOpen={deleteTargetId !== null}
        message="이 댓글을 삭제하시겠습니까?"
        confirmText="삭제"
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
      />

      {/* 안내 모달 (확인 버튼 하나) */}
      <Modal
        isOpen={alertMessage !== ''}
        message={alertMessage}
        onClose={() => setAlertMessage('')}
      />
    </div>
  );
}

export default Comments;

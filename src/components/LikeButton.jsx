import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';
import Modal from './Modal';

// 글 상세 페이지의 좋아요 버튼입니다.
//
// 넘겨받는 값
// - postId           : 어느 글인지
// - initialLikeCount : posts.like_count 값. 상세 페이지가 글을 조회할 때 이미
//                      받아온 값이라, 개수를 세는 요청을 한 번 아끼려고 넘겨받습니다.
function LikeButton({ postId, initialLikeCount }) {
  const user = useUser();
  const navigate = useNavigate();

  // 화면에 보여줄 좋아요 개수
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  // 내가 이 글에 좋아요를 눌러 두었는지
  const [isLiked, setIsLiked] = useState(false);

  // true 인 동안 버튼을 막습니다. 연타로 요청이 여러 번 나가는 것을 방지합니다.
  const [isToggling, setIsToggling] = useState(false);

  // 안내 모달에 띄울 문구. 빈 문자열이면 닫힌 상태입니다.
  // 요청이 실패했을 때처럼 "알려주기만 하면 되는" 경우에 씁니다.
  const [alertMessage, setAlertMessage] = useState('');

  // 로그인하지 않은 사람이 눌렀을 때 뜨는 모달.
  //
  // 위의 alertMessage 와 따로 두는 이유: 이 모달에는 로그인 페이지로 보내는
  // 버튼이 붙습니다. 안내만 하고 "그럼 어떻게 하라는 거지"를 사용자가 알아서
  // 찾게 두는 대신, 갈 곳을 바로 내주는 편이 낫습니다.
  // 문구만 갈아끼우는 방식으로는 버튼이 있는 모달과 없는 모달을 구분할 수 없습니다.
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  const userId = user ? user.id : null;

  useEffect(() => {
    // 로그인하지 않았으면 "내가 눌렀는지"를 따질 것도 없습니다.
    // 개수는 이미 넘겨받았으므로 조회 자체를 하지 않습니다.
    if (!userId || !Number.isInteger(postId)) {
      return;
    }

    // 조회하는 동안 사용자가 로그아웃하거나 계정을 바꿀 수 있습니다.
    // 그러면 뒤늦게 도착한 옛 결과가 새 값을 덮어쓰므로, 이 표시를 두고
    // "이미 지난 요청이면 결과를 버리도록" 합니다. (AuthContext 와 같은 방식)
    let isOutdated = false;

    async function fetchIsLiked() {
      // 내가 누른 기록 한 줄만 찾습니다. 없으면 maybeSingle() 이 null 을 줍니다.
      // 이 글의 좋아요를 전부 받아와 그 안에 내가 있는지 보는 방법도 있지만,
      // 좋아요가 1000개면 1000줄을 받게 됩니다.
      const { data } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (isOutdated) {
        return;
      }

      setIsLiked(data ? true : false);
    }

    fetchIsLiked();

    return () => {
      isOutdated = true;
    };
  }, [postId, userId]);

  async function handleToggle() {
    if (!user) {
      setIsLoginPromptOpen(true);
      return;
    }

    if (isToggling) {
      return;
    }
    setIsToggling(true);

    if (isLiked) {
      // 좋아요 취소.
      //
      // .select() 를 붙여 실제로 몇 줄이 지워졌는지 확인합니다.
      // 붙이지 않으면 DB(RLS)가 막아도 error 가 null 이라, 지워지지 않았는데
      // 지워진 것처럼 보입니다. (글·댓글 삭제와 같은 이유)
      const { data, error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .select();

      setIsToggling(false);

      if (error) {
        console.log('좋아요 취소 에러:', error);
        setAlertMessage('잠시 후 다시 시도해 주세요.');
        return;
      }

      // 지워진 줄이 없다 = 애초에 눌러둔 적이 없었다는 뜻입니다.
      // (다른 탭에서 이미 취소한 경우) 개수는 건드리지 않고 상태만 맞춥니다.
      if (data.length === 0) {
        setIsLiked(false);
        return;
      }

      setIsLiked(false);
      setLikeCount(likeCount - 1);
      return;
    }

    // 좋아요 누르기
    const { error } = await supabase
      .from('post_likes')
      .insert([{ post_id: postId, user_id: user.id }]);

    setIsToggling(false);

    if (error) {
      // 23505 = 기본키가 겹쳤다는 뜻입니다. 여기서는 (post_id, user_id) 묶음이
      // 이미 있다는 것이니, 다른 탭이나 다른 기기에서 이미 누른 경우입니다.
      // 에러로 안내할 일이 아니라 "이미 눌러둔 상태"로 화면을 맞추면 됩니다.
      if (error.code === '23505') {
        setIsLiked(true);
        return;
      }

      console.log('좋아요 에러:', error);
      setAlertMessage('잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsLiked(true);
    setLikeCount(likeCount + 1);
  }

  // 눌러둔 상태면 색이 채워진 버튼으로 보여줍니다.
  let buttonClass = 'like-button';
  if (isLiked) {
    buttonClass = 'like-button like-button-on';
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={handleToggle}
        disabled={isToggling}
        // 버튼 안의 글자가 "♥ 3" 뿐이라 무엇을 하는 버튼인지 읽어주지 않습니다.
        aria-label={isLiked ? '좋아요 취소' : '좋아요'}
        aria-pressed={isLiked}
      >
        <span className="like-heart">♥</span>
        <span className="like-count">{likeCount}</span>
      </button>

      {/* 로그인 안내 모달.
          onConfirm 을 넘기면 Modal 이 [닫기 / 로그인하기] 두 버튼짜리가 됩니다. */}
      <Modal
        isOpen={isLoginPromptOpen}
        message="로그인 후 이용할 수 있습니다."
        cancelText="닫기"
        confirmText="로그인하기"
        onClose={() => setIsLoginPromptOpen(false)}
        onConfirm={() => navigate('/login')}
      />

      {/* 요청이 실패했을 때 띄우는 안내 모달 (확인 버튼 하나) */}
      <Modal
        isOpen={alertMessage !== ''}
        message={alertMessage}
        onClose={() => setAlertMessage('')}
      />
    </>
  );
}

export default LikeButton;

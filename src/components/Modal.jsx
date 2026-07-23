import { useEffect } from 'react';

// 여러 페이지에서 돌려 쓰는 모달(팝업) 컴포넌트입니다.
//
// 사용하는 쪽에서 넘겨주는 값(props)
// - isOpen      : true 일 때만 화면에 나타납니다. (false 면 아무것도 안 그림)
// - message     : 모달 안에 보여줄 안내 문구
// - onClose     : "확인" 또는 "취소"를 눌러 모달을 닫을 때 실행할 함수
// - onConfirm   : (선택) 넘겨주면 [취소 / 확인] 두 버튼짜리 "확인용" 모달이 됩니다.
//                 안 넘기면 [확인] 한 버튼짜리 "알림용" 모달이 됩니다.
// - confirmText : (선택) 확인 버튼에 쓸 글자. 기본값은 '확인'
// - cancelText  : (선택) 취소 버튼에 쓸 글자. 기본값은 '취소'
function Modal({ isOpen, message, onClose, onConfirm, confirmText, cancelText }) {
  // 모달이 열려 있는 동안 두 가지를 처리합니다.
  //   1) ESC 키를 누르면 닫습니다.
  //   2) 뒤쪽 페이지가 스크롤되지 않게 막습니다.
  //
  // useEffect 는 "화면에 그려진 뒤에 할 일"을 적는 곳입니다.
  // return 으로 돌려주는 함수는 정리(뒷정리) 담당이라, 모달이 닫히거나
  // 페이지를 떠날 때 실행되어 걸어둔 것을 원래대로 되돌립니다.
  //
  // 훅(useEffect)은 아래 "닫혀 있으면 그리지 않는다"보다 위에 있어야 합니다.
  // 훅은 어떤 경우에도 항상 같은 순서로 실행되어야 하기 때문입니다.
  useEffect(() => {
    // 닫혀 있을 때는 아무것도 걸지 않습니다.
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    // 원래 값을 기억해 뒀다가 나중에 그대로 되돌립니다.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  // 닫혀 있으면 화면에 아무것도 그리지 않습니다.
  if (!isOpen) {
    return null;
  }

  // onConfirm 함수가 넘어왔으면 "확인용(취소+확인)" 모달입니다.
  const isConfirmModal = onConfirm ? true : false;

  return (
    // 화면 전체를 덮는 반투명 배경
    <div className="modal-overlay">
      {/* 가운데 뜨는 하얀 상자 */}
      <div className="modal-box">
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          {/* 확인용 모달일 때만 취소 버튼을 보여줍니다. */}
          {isConfirmModal && (
            <button type="button" className="btn" onClick={onClose}>
              {cancelText ? cancelText : '취소'}
            </button>
          )}

          {/* 확인 버튼
              - 알림용 모달이면 그냥 닫기(onClose)
              - 확인용 모달이면 확인 동작(onConfirm) 실행 */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={isConfirmModal ? onConfirm : onClose}
          >
            {confirmText ? confirmText : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;

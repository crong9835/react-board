import { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  // 모달이 열려 있는 동안 ESC 키로 닫고, 뒤쪽 페이지 스크롤을 막습니다.
  // useEffect 의 return 은 뒷정리 담당이라, 모달이 닫히거나 페이지를 떠날 때
  // 실행되어 걸어둔 것을 원래대로 되돌립니다.
  //
  // 이 훅은 아래 "닫혀 있으면 그리지 않는다"보다 위에 있어야 합니다.
  // 훅은 어떤 경우에도 항상 같은 순서로 실행되어야 하기 때문입니다.
  useEffect(() => {
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

  if (!isOpen) {
    return null;
  }

  // onConfirm 함수가 넘어왔으면 "확인용(취소+확인)" 모달입니다.
  const isConfirmModal = onConfirm ? true : false;

  // createPortal 은 "이 화면을 여기 말고 저기에 그려라" 라는 뜻입니다.
  // 여기서는 이 컴포넌트를 쓴 자리(카드 안)가 아니라 문서 맨 바깥(body)에 그립니다.
  //
  // 왜 이렇게 하냐면, 어두운 막(.modal-overlay)은 position: fixed 로
  // "화면 전체"를 덮게 해뒀는데, 조상 중에 transform 이 걸린 요소가 하나라도 있으면
  // 그 요소가 fixed 의 기준이 되어버립니다. 즉 화면이 아니라 그 요소만 덮습니다.
  //
  // .card 에 등장 애니메이션(card-rise)이 걸려 있고 끝난 뒤에도 마지막 상태를
  // 유지하도록(both) 해둬서, 카드에는 transform 이 계속 남아 있습니다.
  // 그래서 모달을 카드 안에 두면 막이 카드 크기로 쪼그라들고 모달도 화면 중앙이 아니라
  // 카드 중앙에 뜹니다. body 로 빼내면 위에 무엇이 있든 영향을 받지 않습니다.
  return createPortal(
    <div className="modal-overlay">
      <div className="modal-box">
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          {/* 확인용 모달일 때만 취소 버튼을 보여줍니다. */}
          {isConfirmModal && (
            <button type="button" className="btn" onClick={onClose}>
              {cancelText ? cancelText : '취소'}
            </button>
          )}

          {/* 알림용이면 그냥 닫기(onClose), 확인용이면 확인 동작(onConfirm) */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={isConfirmModal ? onConfirm : onClose}
          >
            {confirmText ? confirmText : '확인'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default Modal;

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

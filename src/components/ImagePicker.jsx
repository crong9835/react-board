import { useState, useEffect, useMemo, useRef } from 'react';
import { validateImageFile, IMAGE_ACCEPT, IMAGE_HINT } from '../postImage';

// 글에 붙일 사진을 고르는 칸입니다. 글쓰기와 글 수정 두 화면에서 함께 씁니다.
//
// 이 컴포넌트는 파일을 올리지 않습니다. 고른 파일을 보여주고 부모에게 알려줄
// 뿐이고, 실제 업로드는 "등록"·"수정" 버튼을 눌렀을 때 부모가 합니다.
//
// 왜 고르는 즉시 올리지 않는가:
// 사진만 올려두고 글을 등록하지 않은 채 페이지를 떠나면, 어느 글에도 속하지
// 않은 파일이 보관소에 남습니다. 등록할 때 함께 올리면 그런 파일이 생기지
// 않습니다. (미리보기는 서버에 올리지 않고도 만들 수 있습니다. 아래 참고)
//
// 넘겨받는 값(props)
// - file         : 지금 고른 파일 (File 객체, 안 골랐으면 null)
// - existingUrl  : 이미 저장돼 있는 사진의 주소. 글 수정 화면에서만 씁니다.
//                  (글쓰기 화면은 저장된 사진이 없으므로 넘기지 않습니다)
// - onSelect     : 파일을 골랐을 때 부모에게 알리는 함수. onSelect(file)
// - onRemove     : "사진 빼기" 를 눌렀을 때 부모에게 알리는 함수
// - disabled     : 등록/수정이 진행 중인 동안 true. 그때는 못 건드리게 합니다.
function ImagePicker({ file, existingUrl, onSelect, onRemove, disabled }) {
  // 사진이 아닌 파일이나 너무 큰 파일을 골랐을 때 보여줄 안내 문구입니다.
  //
  // 이 게시판은 안내를 대부분 모달로 띄우지만 여기서는 칸 아래 글자로 둡니다.
  // 파일을 고르다 실수한 것은 바로 다시 고르면 되는 일이라, 모달을 띄워
  // "확인" 을 누르게 하면 오히려 손이 한 번 더 갑니다.
  const [errorMessage, setErrorMessage] = useState('');

  // 진짜 <input type="file"> 을 가리키는 손잡이입니다. 아래 handleRemove 에서
  // 이 칸의 값을 비우는 데 씁니다. (이유는 그 함수의 주석 참고)
  const inputRef = useRef(null);

  // 고른 파일을 화면에 미리 보여주기 위한 임시 주소입니다.
  //
  // URL.createObjectURL(file) 은 브라우저가 자기 메모리에 있는 파일에
  // "blob:http://localhost:5173/9b2e..." 같은 임시 주소를 붙여주는 함수입니다.
  // 그래서 서버에 올리기 전에도 <img src=...> 로 보여줄 수 있습니다.
  //
  // useMemo 로 감싼 이유: 이 함수는 부를 때마다 새 주소를 하나씩 만들어냅니다.
  // 그냥 두면 화면을 다시 그릴 때마다(글자 하나 칠 때마다) 주소가 새로 생겨
  // 쓰지 않는 것이 계속 쌓입니다. useMemo 는 "[] 안의 값이 바뀔 때만 다시
  // 계산하라" 는 뜻이라, file 이 바뀌지 않는 한 처음 만든 주소를 그대로 씁니다.
  const previewUrl = useMemo(() => {
    if (!file) {
      return '';
    }

    return URL.createObjectURL(file);
  }, [file]);

  // 위에서 만든 임시 주소를 다 쓰면 놓아줍니다.
  //
  // 이 주소는 브라우저가 원본 파일을 메모리에 붙잡아 두게 만듭니다.
  // revokeObjectURL 로 놓아주지 않으면, 사진을 여러 번 바꿨을 때 이제는
  // 쓰지 않는 파일까지 메모리에 계속 남습니다.
  //
  // useEffect 의 return 은 뒷정리 담당입니다. 여기서는 previewUrl 이 바뀌기
  // 직전(= 사진을 바꿨을 때)과 이 칸이 화면에서 사라질 때(= 다른 페이지로
  // 옮겼을 때) 실행되어, 방금까지 쓰던 주소를 놓아줍니다.
  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // async 인 이유: 검사가 파일 내용을 읽고 사진을 한 번 펼쳐 보기 때문입니다.
  // (무엇을 검사하는지는 postImage.js 의 validateImageFile 참고)
  async function handleChange(event) {
    // event.target 을 미리 붙잡아 둡니다. ★
    // 아래 await 뒤에도 이 칸을 비워야 하는데, 그때 event 는 이미 처리가 끝난
    // 옛 사건입니다. 미리 변수에 담아두면 그것과 상관없이 칸을 가리킬 수 있습니다.
    const input = event.target;

    // 파일 고르기 창에서 "취소" 를 누르면 고른 파일이 없습니다.
    // 그때는 원래 있던 사진을 그대로 두어야 하므로 아무것도 하지 않습니다.
    const nextFile = input.files[0];

    if (!nextFile) {
      return;
    }

    const message = await validateImageFile(nextFile);

    if (message) {
      setErrorMessage(message);

      // 잘못 고른 파일은 붙잡아 두지 않고 칸을 비웁니다.
      // 그대로 두면 파일 이름은 보이는데 미리보기는 안 뜨는 상태가 됩니다.
      input.value = '';
      return;
    }

    setErrorMessage('');
    onSelect(nextFile);
  }

  function handleRemove() {
    // <input type="file"> 은 React 가 값을 쥐고 있지 못하는 유일한 입력칸입니다.
    // (보안상 코드로 파일을 넣을 수 없어서, value 를 지정할 수 없습니다)
    // 그래서 부모의 file 을 null 로 되돌려도 이 칸에는 방금 고른 파일이
    // 그대로 남아 있습니다. 그 상태에서 같은 파일을 다시 고르면 "바뀐 게 없다"며
    // onChange 가 아예 실행되지 않습니다. 직접 비워줘야 하는 이유입니다.
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    setErrorMessage('');
    onRemove();
  }

  // 보여줄 사진을 정합니다.
  // 새로 고른 파일이 있으면 그것이 먼저입니다. 사진을 바꾸는 중이라는 뜻이므로,
  // 저장돼 있던 옛 사진이 아니라 앞으로 저장될 새 사진을 보여줘야 합니다.
  let shownUrl = '';
  if (previewUrl) {
    shownUrl = previewUrl;
  } else if (existingUrl) {
    shownUrl = existingUrl;
  }

  return (
    <div className="image-picker">
      {/* 진짜 파일 입력칸입니다. 눈에 보이지 않게 숨겨두고, 아래 label 을
          눌렀을 때 열리게 합니다.
          브라우저마다 기본 모양(파일 선택 / 선택된 파일 없음)이 제각각이라
          게시판의 다른 버튼과 나란히 두면 혼자 튀기 때문입니다.

          display: none 이 아니라 .visually-hidden 으로 숨기는 이유는
          App.css 의 주석에 적어 뒀습니다. */}
      <input
        ref={inputRef}
        id="post-image-input"
        className="visually-hidden"
        type="file"
        accept={IMAGE_ACCEPT}
        disabled={disabled}
        onChange={handleChange}
      />

      <div className="image-picker-actions">
        {/* label 의 htmlFor 가 위 입력칸의 id 와 같으면, 이 label 을 누르는 것이
            그 칸을 누르는 것과 같아집니다. 그래서 버튼처럼 꾸며두면 파일 고르기
            창이 열립니다. onClick 을 따로 붙일 필요가 없습니다. */}
        <label
          htmlFor="post-image-input"
          className={disabled ? 'btn btn-file btn-file-off' : 'btn btn-file'}
        >
          {shownUrl ? '사진 바꾸기' : '사진 첨부'}
        </label>

        {/* 사진이 있을 때만 빼기 버튼을 보여줍니다. */}
        {shownUrl && (
          <button
            type="button"
            className="btn"
            disabled={disabled}
            onClick={handleRemove}
          >
            사진 빼기
          </button>
        )}

        <span className="image-picker-hint">{IMAGE_HINT}</span>
      </div>

      {errorMessage && <p className="image-picker-error">{errorMessage}</p>}

      {shownUrl && (
        <div className="image-preview">
          {/* alt 는 사진을 못 볼 때(안 열렸거나 화면을 읽어주는 경우) 대신
              읽히는 설명입니다. 사용자가 무엇을 올렸는지 우리는 알 수 없으므로
              "첨부한 사진" 이라는 역할만 적어 둡니다. */}
          <img src={shownUrl} alt="첨부한 사진" />
        </div>
      )}
    </div>
  );
}

export default ImagePicker;

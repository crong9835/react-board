import { Link, useParams } from 'react-router-dom';

// 헤더 네비게이션에는 있지만 아직 만들지 않은 메뉴를 눌렀을 때 보여주는 페이지입니다.
//
// App.jsx 에 <Route path="/soon/:name"> 으로 등록되어 있습니다.
// :name 은 "이 자리에 뭐가 오든 받아서 name 이라는 이름으로 넘겨줘" 라는 뜻입니다.
// 그래서 메뉴가 늘어나도 페이지를 새로 만들 필요 없이 주소만 이어 붙이면 됩니다.
//   /soon/인기글    → name 은 '인기글'
//   /soon/공지사항  → name 은 '공지사항'
function ComingSoon() {
  // useParams 는 주소에서 :name 자리에 실제로 들어온 값을 꺼내줍니다.
  // 한글이 주소에서는 %EC%9D%B8... 처럼 변환되어 있는데, 꺼낼 때 원래 글자로 되돌려줍니다.
  const { name } = useParams();

  return (
    <div className="notice">
      <p className="notice-emoji">🚧</p>

      <h2 className="notice-title">와이라누...</h2>

      <p className="notice-lead">「{name}」은 아직 없습니다.</p>

      <p className="notice-desc">
        개발자가 커피를 마시며 열심히 구상하는 중입니다. 정말입니다.
      </p>

      {/* 농담용 진행률 막대입니다. 실제로 뭘 재는 건 아니고,
          채워진 길이(7%)는 App.css 의 .progress-fill 에 고정으로 적혀 있습니다. */}
      <div className="progress">
        <div className="progress-fill"></div>
      </div>
      <p className="progress-caption">진행률 7% · 예상 완료일: 언젠가</p>

      <div className="center-actions">
        <Link to="/" className="btn btn-primary">
          글 목록으로
        </Link>
      </div>
    </div>
  );
}

export default ComingSoon;

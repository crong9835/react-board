import { Link, useParams } from 'react-router-dom';

// 아직 만들지 않은 메뉴를 눌렀을 때 보여주는 페이지입니다.
// App.jsx 에 <Route path="/soon/:name"> 으로 등록되어 있어서, 메뉴가 늘어나도
// 페이지를 새로 만들 필요 없이 주소만 이어 붙이면 됩니다. (/soon/인기글 → '인기글')
function ComingSoon() {
  // 한글은 주소에서 %EC%9D%B8... 로 변환되지만 useParams 가 원래 글자로 되돌려줍니다.
  const { name } = useParams();

  return (
    <div className="notice">
      <p className="notice-emoji">🚧</p>

      <h2 className="notice-title">와이라누...</h2>

      <p className="notice-lead">「{name}」은 아직 없습니다.</p>

      <p className="notice-desc">
        개발자가 커피를 마시며 열심히 구상하는 중입니다. 정말입니다.
      </p>

      {/* 농담용 진행률 막대. 채워진 길이(7%)는 App.css 의 .progress-fill 에 있습니다. */}
      <div className="progress">
        <div className="progress-fill"></div>
      </div>
      <p className="progress-caption">진행률 7% · 예상 완료일: 언젠가</p>

      <div className="center-actions">
        <Link to="/" className="btn btn-primary">
          목록으로
        </Link>
      </div>
    </div>
  );
}

export default ComingSoon;

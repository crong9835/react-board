import { Link } from 'react-router-dom';

// 주소창에 없는 주소를 쳤을 때 보여주는 페이지입니다.
// App.jsx 의 <Route path="*"> 가 이 컴포넌트를 씁니다.
//
// 준비 중 페이지(ComingSoon)와 생김새를 맞추려고 같은 .notice 스타일을 씁니다.
// 다른 점은 이쪽이 "아예 없는 주소"라는 것뿐입니다.
function NotFound() {
  return (
    <div className="notice">
      <p className="notice-code">404</p>

      <h2 className="notice-title">와이라누?</h2>

      <p className="notice-lead">이런 주소는 없습니다.</p>

      <p className="notice-desc">
        주소를 잘못 누르셨거나, 아직 만들어지지 않았거나 둘 중 하나입니다.
        <br />
        아마도 후자일 겁니다.
      </p>

      <div className="center-actions">
        <Link to="/" className="btn btn-primary">
          글 목록으로
        </Link>
      </div>
    </div>
  );
}

export default NotFound;

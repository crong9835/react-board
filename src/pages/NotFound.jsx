import { Link } from 'react-router-dom';

// 주소창에 없는 주소를 쳤을 때 보여주는 페이지입니다.
// App.jsx 의 <Route path="*"> 가 이 컴포넌트를 씁니다.
function NotFound() {
  return (
    <div>
      <p className="empty">페이지를 찾을 수 없습니다.</p>

      <div className="center-actions">
        <Link to="/" className="btn">
          목록으로
        </Link>
      </div>
    </div>
  );
}

export default NotFound;

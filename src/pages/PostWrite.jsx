import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../AuthContext';

function PostWrite({ posts, setPosts }) {
  const navigate = useNavigate();
  const user = useUser(); // 로그인한 사용자
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    // 작성자는 로그인한 사용자로 자동 저장
    // user_id 를 같이 저장해야 나중에 "본인 글"인지 확인할 수 있음
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title,
          content,
          writer: user.email,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log('에러:', error);
      return;
    }

    setPosts([data, ...posts]);
    navigate('/');
  }

  return (
    <div>
      <h2>글쓰기 페이지</h2>

      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            취소
          </button>

          <button type="submit" className="btn btn-primary">
            등록
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostWrite;

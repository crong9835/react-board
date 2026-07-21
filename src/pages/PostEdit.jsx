import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';

function PostEdit({ posts, setPosts }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const post = posts.find((post) => post.id === Number(id));

  const [title, setTitle] = useState(post ? post.title : '');
  const [content, setContent] = useState(post ? post.content : '');

  const TITLE_MAX = 30; // 제목 최대 글자수
  const CONTENT_MAX = 500; // 내용 최대 글자수

  async function handleSubmit(event) {
    event.preventDefault();

    // 제목/내용이 비어있으면 수정 막기
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // 글자수 제한 검증
    if (title.length > TITLE_MAX) {
      alert(`제목은 ${TITLE_MAX}자 이하로 입력해주세요.`);
      return;
    }
    if (content.length > CONTENT_MAX) {
      alert(`내용은 ${CONTENT_MAX}자 이하로 입력해주세요.`);
      return;
    }

    // 제목과 내용만 수정 (작성자는 바뀌지 않음)
    const { error } = await supabase
      .from('posts')
      .update({ title, content })
      .eq('id', Number(id));

    if (error) {
      console.log('수정 에러:', error);
      return;
    }

    setPosts(
      posts.map((p) =>
        p.id === Number(id) ? { ...p, title: title, content: content } : p,
      ),
    );
    navigate(`/post/${id}`);
  }

  return (
    <div>
      <h2>글 수정 페이지</h2>

      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="제목"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="char-count">
          {title.length} / {TITLE_MAX}
        </p>

        <textarea
          placeholder="내용"
          value={content}
          maxLength={CONTENT_MAX}
          onChange={(e) => setContent(e.target.value)}
        />
        <p className="char-count">
          {content.length} / {CONTENT_MAX}
        </p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            취소
          </button>

          <button type="submit" className="btn btn-primary">
            수정
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostEdit;

import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';

function PostEdit({ posts, setPosts }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const post = posts.find((post) => post.id === Number(id));

  const [title, setTitle] = useState(post ? post.title : '');
  const [content, setContent] = useState(post ? post.content : '');

  async function handleSubmit(event) {
    event.preventDefault();

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
            수정
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostEdit;

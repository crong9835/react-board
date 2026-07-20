import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';

function PostWrite({ posts, setPosts }) {
  const navigate = useNavigate();
  const [writer, setWriter] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const { data, error } = await supabase
      .from('posts')
      .insert([{ title, writer, content }])
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
        <input
          type="text"
          placeholder="작성자"
          value={writer}
          onChange={(e) => setWriter(e.target.value)}
        />

        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          등록
        </button>
      </form>
    </div>
  );
}

export default PostWrite;

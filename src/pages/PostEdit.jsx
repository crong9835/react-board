import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

function PostEdit({ posts, setPosts }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const post = posts.find((post) => post.id === Number(id));

  const [writer, setWriter] = useState(post ? post.writer : '');
  const [title, setTitle] = useState(post ? post.title : '');
  const [content, setContent] = useState(post ? post.content : '');

  function handleSubmit(event) {
    event.preventDefault();
    setPosts(
      posts.map((p) =>
        p.id === Number(id)
          ? { ...p, writer: writer, title: title, content: content }
          : p,
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
          수정
        </button>
      </form>
    </div>
  );
}

export default PostEdit;

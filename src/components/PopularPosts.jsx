import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { getImageUrl } from '../postImage';
import { formatWriter } from '../format';

// 유머 모음집(/) 맨 위에 붙는 인기글 카드입니다.
//
// 좋아요를 가장 많이 받은 글 세 개를 사진과 함께 보여줍니다.
// 목록은 제목만 한 줄씩 늘어놓는 곳이라, 어떤 글이 재미있는지 알 수 없습니다.
// 카드 세 장을 위에 두면 들어오자마자 볼 만한 글이 눈에 들어옵니다.
//
// 목록(PostList)과 조회를 따로 하는 이유:
// 목록은 "최신순 15개", 인기글은 "좋아요순 3개" 라 조건이 완전히 다릅니다.
// 한 번의 조회로는 둘 다 얻을 수 없어서 어차피 두 번 물어봐야 합니다.
// 그럴 바에는 각자 필요한 것을 각자 가져오는 편이, 나중에 한쪽을 고칠 때
// 다른 쪽을 건드리지 않게 됩니다. (이 프로젝트가 목록·상세·수정을 나눠 둔 방식)
//
// /popular 페이지와 겹치지 않나:
// 겹칩니다. 다만 거기는 "좋아요받은 글 전부를 페이지 나눠서" 보여주고,
// 여기는 "맨 위 세 개만" 보여줍니다. 아래 [더보기] 가 거기로 이어집니다.

// 카드로 보여줄 개수. 아래 CSS 의 3칸 배치와 맞춘 숫자입니다.
const CARD_COUNT = 3;

function PopularPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPopular() {
      // 목록과 달리 사진 경로(image_path)까지 가져옵니다. 카드에 사진을 보여줘야
      // 하기 때문입니다. 본문(content)은 카드에 쓰지 않으므로 빼둡니다.
      //
      // 정렬 기준이 두 개인 이유: 좋아요 개수가 같은 글끼리는 순서가 들쭉날쭉해서
      // 새로고침할 때마다 카드 순서가 바뀝니다. 두 번째 기준(최신순)을 달아둡니다.
      // (PostList 의 인기글 정렬과 같은 규칙입니다)
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, writer, like_count, image_path')
        .gt('like_count', 0)
        .order('like_count', { ascending: false })
        .order('id', { ascending: false })
        .limit(CARD_COUNT);

      if (error) {
        console.log('인기글 조회 에러:', error);
        setLoading(false);
        return;
      }

      setPosts(data);
      setLoading(false);
    }

    fetchPopular();
  }, []);

  // 불러오는 동안 아무것도 그리지 않으면, 카드가 도착하는 순간 아래 목록이
  // 통째로 밀려 내려갑니다. 그래서 크기가 같은 빈 카드로 자리를 잡아둡니다.
  // (목록 마지막 페이지를 빈 줄로 채우는 것과 같은 이유입니다)
  if (loading) {
    return (
      <section className="popular">
        <div className="popular-head">
          <h3 className="popular-title">인기글</h3>
        </div>

        <ul className="popular-cards">
          {/* 내용 없이 자리만 차지하는 카드 세 장.
              Array.from({ length: 3 }) 는 칸이 세 개인 빈 배열을 만듭니다.
              지도(map)를 돌리려면 배열이 있어야 하는데, 보여줄 글이 아직
              없으므로 개수만 있는 배열을 만들어 씁니다. */}
          {Array.from({ length: CARD_COUNT }).map((value, index) => (
            <li key={index} className="popular-card-blank">
              <div className="popular-thumb" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // 아직 아무도 좋아요를 누르지 않았으면 이 자리를 통째로 비웁니다.
  // "인기글이 없습니다" 라고 적어두면, 볼 것도 없는 안내가 목록 위 자리를
  // 계속 차지하게 됩니다.
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="popular">
      <div className="popular-head">
        <h3 className="popular-title">인기글</h3>

        {/* 좋아요받은 글 전체를 보는 곳으로 넘어갑니다.
            헤더의 '인기글' 메뉴와 같은 곳이지만, 카드를 보다가 더 보고 싶어진
            사람이 화면 위쪽까지 눈을 옮기지 않아도 되게 여기에도 둡니다. */}
        <Link to="/popular" className="popular-more">
          더보기
        </Link>
      </div>

      <ul className="popular-cards">
        {posts.map((post) => {
          // 사진이 없는 글이면 빈 문자열입니다.
          const imageUrl = getImageUrl(post.image_path);

          return (
            <li key={post.id}>
              {/* 카드 전체가 링크입니다. 제목만 링크로 두면 사진을 눌렀을 때
                  아무 일도 일어나지 않아 답답합니다.

                  주소에 page 나 from 을 달지 않습니다. 이 카드는 유머 모음집
                  맨 위에 있으므로, 상세에서 "목록으로"를 누르면 조건 없는
                  유머 모음집 1페이지 — 즉 방금 있던 자리로 돌아갑니다. */}
              <Link to={`/post/${post.id}`}>
                <div className="popular-thumb">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" />
                  ) : (
                    // 사진이 없는 글도 카드 크기는 같아야 세 장이 나란히
                    // 맞습니다. 빈 칸으로 두면 허전하므로 표시 하나를 둡니다.
                    //
                    // aria-hidden 은 "화면을 읽어주는 프로그램은 이것을 건너뛰라"
                    // 는 뜻입니다. 이 글자는 꾸밈일 뿐이고, 바로 아래에 제목이
                    // 있어서 읽어줄 필요가 없습니다.
                    // (사진의 alt="" 도 같은 이유로 비워뒀습니다)
                    <span className="popular-thumb-empty" aria-hidden="true">
                      ㅋ
                    </span>
                  )}
                </div>

                <p className="popular-card-title">{post.title}</p>

                <p className="popular-card-meta">
                  <span className="popular-card-likes">♥ {post.like_count}</span>
                  <span className="popular-card-writer">
                    {formatWriter(post.writer)}
                  </span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default PopularPosts;

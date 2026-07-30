// 글에 붙이는 사진을 다루는 함수를 모아둔 파일입니다.
//
// 사진 파일은 posts 표가 아니라 Supabase Storage(파일 보관소)에 들어갑니다.
// posts 에는 보관소 안의 경로(image_path)만 적어 둡니다.
//   예) image_path = "8f3c...a1/9b2e...7d.jpg"
//        └ 올린 사람의 id ┘ └ 겹치지 않는 파일 이름 ┘
//
// 보관함과 접근 정책은 supabase/images.sql 에 있습니다.
//
// 세 곳에서 함께 씁니다.
//   PostWrite.jsx   — 새 글에 사진 올리기
//   PostEdit.jsx    — 사진 바꾸기 / 빼기
//   PostDetail.jsx  — 사진 보여주기, 글을 지울 때 사진도 지우기

import { supabase } from './supabase';

// 사진을 넣어둘 보관함 이름. images.sql 에서 만든 것과 같아야 합니다.
const BUCKET = 'post-images';

// 받아줄 파일 종류와 그에 맞는 확장자입니다.
//
// 왼쪽(image/jpeg)은 "MIME 타입" 이라고 하는, 파일 종류를 가리키는 표준 이름입니다.
//
// 확장자를 파일 이름에서 잘라 쓰지 않고 여기서 정해주는 이유:
// 파일 이름은 "사진"처럼 확장자가 없을 수도 있고, "고양이.JPG.txt" 처럼 헷갈리게
// 생겼을 수도 있습니다. 종류는 어차피 아래에서 검사하므로, 통과한 종류에 맞는
// 확장자를 우리가 붙이는 편이 확실합니다.
const EXTENSION_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// 파일의 진짜 종류를 알아내는 데 쓰는 표식(시그니처) 목록입니다. ★
//
// 브라우저가 알려주는 file.type 을 믿지 않는 이유:
// 그 값은 브라우저가 "파일 이름의 확장자" 를 보고 짐작한 것일 뿐입니다.
// 그래서 아무 파일이나 이름만 cat.jpg 로 바꿔두면 브라우저는 그것을
// image/jpeg 라고 알려줍니다. 이름을 근거로 종류를 정하는 셈이라, 이름을
// 버리고 확장자를 우리가 붙이기로 한 위쪽의 결정과도 앞뒤가 맞지 않습니다.
//
// 사진 파일은 종류마다 맨 앞 몇 바이트가 규격으로 정해져 있습니다. JPG 는 늘
// FF D8 FF 로, PNG 는 늘 89 50 4E 47 ... 로 시작합니다. 사진을 만드는 프로그램이
// 규격에 따라 붙이는 것이라 파일 이름과 달리 사용자가 건드릴 일이 없습니다.
// 그 앞부분을 직접 읽어보는 것이 아래 detectImageType 입니다.
//
// offset 은 "파일의 몇 번째 바이트부터 비교할지" 입니다. (0 이 첫 바이트)
// WEBP 만 두 군데를 봅니다. RIFF 라는 껍데기를 여러 종류가 함께 쓰기 때문에,
// 그 안에 무엇이 들었는지가 적힌 9번째 바이트까지 봐야 WEBP 라고 말할 수 있습니다.
//   R  I  F  F  [파일 크기 4바이트]  W  E  B  P
//   0  1  2  3   4  5  6  7          8  9 10 11
//
// GIF 는 GIF87a · GIF89a 두 가지가 있어서, 둘 다 같은 앞 네 글자(GIF8)까지만 봅니다.
const SIGNATURES = [
  {
    type: 'image/jpeg',
    parts: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  },
  {
    type: 'image/png',
    parts: [
      { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    ],
  },
  {
    // 0x47 0x49 0x46 0x38 은 글자로 읽으면 "GIF8" 입니다.
    type: 'image/gif',
    parts: [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  },
  {
    type: 'image/webp',
    parts: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
    ],
  },
];

// 표식을 확인하려면 파일 앞부분 몇 바이트를 읽어야 하는지입니다.
// 위 목록에서 가장 멀리 보는 곳이 WEBP 의 12번째 바이트까지입니다.
const HEAD_BYTES = 12;

// 한 장의 최대 크기. images.sql 의 file_size_limit 과 같은 값이어야 합니다.
// (1024 * 1024 = 1MB)
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_MB = 5;

// 사진 한 변의 최소·최대 길이(픽셀)입니다.
//
// 최소 64 인 이유: 인기글 카드의 사진 자리가 한 변 180픽셀쯤 됩니다. 그보다
// 작은 사진은 늘려 보여주게 되어 뭉개집니다. 1 x 1 짜리 점 하나가 든 파일도
// 지금까지는 "사진" 으로 통과했는데, 그런 것을 걸러내는 것이 주된 목적입니다.
//
// 최대 8000 인 이유: 5MB 안에도 20000 x 20000 같은 사진이 들어갈 수 있습니다.
// 파일 크기는 압축된 상태라 작지만, 브라우저가 그것을 화면에 펼치는 순간
// 가로 x 세로 x 4바이트만큼의 메모리를 씁니다. 20000 x 20000 이면 1.6GB 라서
// 화면이 멈춥니다. 8000 은 요즘 카메라 사진(가로 4000~6000)보다 넉넉한 값입니다.
const MIN_SIDE = 64;
const MAX_SIDE = 8000;

// <input type="file"> 의 accept 에 넣을 값입니다.
// "image/jpeg,image/png,image/gif,image/webp" 같은 한 줄이 됩니다.
// 이걸 달아두면 파일 고르기 창에서 사진이 아닌 파일은 흐리게 표시됩니다.
export const IMAGE_ACCEPT = Object.keys(EXTENSION_BY_TYPE).join(',');

// 화면에 보여줄 안내 문구. 글쓰기·수정 화면 두 곳에서 같은 말을 써야 하므로
// 여기에 두고 가져다 씁니다.
export const IMAGE_HINT = `JPG · PNG · GIF · WEBP, ${MAX_MB}MB 이하 한 장`;

// head 의 offset 자리부터 bytes 와 똑같은 바이트가 이어지는지 봅니다.
//
// 파일이 bytes 길이보다 짧으면 head[offset + index] 가 undefined 가 되고,
// 그것은 어떤 숫자와도 같지 않으므로 자연스럽게 false 가 됩니다.
// (12바이트도 안 되는 파일은 사진일 수 없으니 이 결과가 맞습니다)
function matchesBytes(head, offset, bytes) {
  for (let index = 0; index < bytes.length; index++) {
    if (head[offset + index] !== bytes[index]) {
      return false;
    }
  }

  return true;
}

// 파일 앞부분을 직접 읽어 진짜 종류를 알아냅니다.
// 아는 종류면 그 MIME 타입('image/jpeg' 등)을, 모르는 종류면 빈 문자열을 돌려줍니다.
async function detectImageType(file) {
  // file.slice 는 파일의 일부만 잘라냅니다. 종류를 알아내는 데 필요한 것은
  // 앞 12바이트뿐이라, 5MB 짜리를 통째로 메모리에 올릴 이유가 없습니다.
  //
  // arrayBuffer() 는 그 조각을 실제로 읽어들이는 함수입니다. 파일을 읽는 일은
  // 곧바로 끝나지 않으므로 await 이 필요하고, 그래서 이 함수도 async 입니다.
  // Uint8Array 로 감싸면 읽어들인 덩어리를 바이트 하나씩 꺼내 볼 수 있습니다.
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());

  for (const signature of SIGNATURES) {
    // parts 가 여러 개인 종류(WEBP)는 그 모두가 맞아야 그 종류입니다.
    let allMatched = true;

    for (const part of signature.parts) {
      if (!matchesBytes(head, part.offset, part.bytes)) {
        allMatched = false;
        break;
      }
    }

    if (allMatched) {
      return signature.type;
    }
  }

  return '';
}

// 사진의 가로·세로 크기를 알아냅니다.
// 펼쳐지지 않는 파일(내용이 깨졌거나 중간이 잘린 파일)이면 null 을 돌려줍니다.
//
// createImageBitmap 은 브라우저가 사진을 실제로 펼쳐(디코딩) 보는 함수입니다.
// 앞부분 표식만 맞고 뒤가 잘린 파일은 표식 검사는 통과하지만 여기서 걸립니다.
// 화면에 올렸을 때 깨진 그림 표시가 뜨는 파일을 미리 잡아내는 자리입니다.
async function readImageSize(file) {
  try {
    const bitmap = await createImageBitmap(file);

    const size = { width: bitmap.width, height: bitmap.height };

    // 펼친 사진은 메모리를 차지합니다. 우리는 크기만 알면 되므로 바로 놓아줍니다.
    // (ImagePicker 가 미리보기 주소를 revokeObjectURL 로 놓아주는 것과 같은 이유입니다)
    bitmap.close();

    return size;
  } catch {
    // 펼치지 못했다는 것은 사진 파일이 아니거나 내용이 깨졌다는 뜻입니다.
    return null;
  }
}

// 고른 파일이 올려도 되는 파일인지 봅니다.
// 문제가 없으면 빈 문자열을, 있으면 사용자에게 보여줄 안내 문구를 돌려줍니다.
//
// 파일을 읽어봐야 알 수 있는 것들이라 async 입니다. 부르는 쪽에서 await 하세요.
//
// 이 검사는 "배려" 이지 "차단" 이 아닙니다. 브라우저 코드는 사용자가 얼마든지
// 고칠 수 있으므로 진짜 차단은 보관함 설정(allowed_mime_types, file_size_limit)이
// 합니다. 여기서 먼저 걸러주는 것은, 어차피 거절당할 파일을 몇십 초 동안
// 올리고 나서야 실패를 알게 되는 일이 없게 하려는 것입니다.
//
// 다만 아래 세 가지 중 보관함이 봐주는 것은 크기와 종류뿐이고, 그 종류마저
// "우리가 보낸다고 적어 준 값" 을 보고 판단합니다. 파일 내용을 직접 열어보는
// 곳은 이 함수뿐입니다. 그것까지 서버에서 막으려면 파일을 받아 검사하는
// Edge Function 을 따로 만들어야 합니다.
export async function validateImageFile(file) {
  // 크기를 가장 먼저 봅니다. 5MB 를 넘는 파일은 내용을 읽어볼 필요도 없습니다.
  if (file.size > MAX_BYTES) {
    return `사진이 너무 큽니다. ${MAX_MB}MB 이하로 올려주세요.`;
  }

  // 종류는 파일 이름이나 file.type 이 아니라 내용으로 판단합니다. (위 SIGNATURES 참고)
  const type = await detectImageType(file);

  if (!type) {
    return `사진 파일만 올릴 수 있습니다. (${IMAGE_HINT})`;
  }

  const size = await readImageSize(file);

  if (!size) {
    return '사진이 깨져 있어 열 수 없습니다. 다른 파일을 골라주세요.';
  }

  if (size.width < MIN_SIDE || size.height < MIN_SIDE) {
    return `너무 작은 사진입니다. 가로·세로가 ${MIN_SIDE}픽셀 이상이어야 합니다.`;
  }

  if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
    return `너무 큰 사진입니다. 가로·세로가 ${MAX_SIDE}픽셀 이하여야 합니다.`;
  }

  return '';
}

// 보관소 경로(image_path)를 화면에 쓸 수 있는 전체 주소로 바꿔줍니다.
//   "8f3c.../9b2e....jpg"
//   → "https://xxxx.supabase.co/storage/v1/object/public/post-images/8f3c.../9b2e....jpg"
//
// 사진이 없는 글도 많으므로, 경로가 없으면 빈 문자열을 돌려줍니다.
// 그래야 쓰는 쪽에서 if (경로) 를 한 번 더 쓰지 않아도 됩니다.
//
// getPublicUrl 은 주소 문자열을 계산해서 돌려줄 뿐, 서버에 물어보지 않습니다.
// 그래서 await 이 필요 없고, 화면을 그리는 도중에 불러도 괜찮습니다.
export function getImageUrl(imagePath) {
  if (!imagePath) {
    return '';
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath);

  return data.publicUrl;
}

// 사진 한 장을 보관소에 올립니다.
// 성공하면 { path: '...', error: '' }, 실패하면 { path: '', error: '안내 문구' } 입니다.
//
// 돌려주는 값을 supabase 처럼 { data, error } 로 두지 않고 path 로 이름 지은 이유:
// 부르는 쪽이 필요한 것은 오직 "posts.image_path 에 넣을 경로" 하나뿐입니다.
// error 도 Supabase 의 에러 객체가 아니라 화면에 그대로 띄울 수 있는 문구로
// 바꿔서 돌려줍니다. 에러 객체의 message 는 영어라 사용자에게 보여줄 수 없습니다.
export async function uploadPostImage(file, userId) {
  // 종류를 여기서 한 번 더 알아냅니다.
  //
  // validateImageFile 이 이미 봤는데 왜 또 보는가:
  // 그 함수는 "사용자에게 안내할 문구" 를 만드는 곳이고, 이 함수는 "저장할 경로" 를
  // 만드는 곳입니다. 둘을 이어 붙이면 파일을 고르는 화면(ImagePicker)이 알아낸
  // 종류를 등록 화면(PostWrite)을 거쳐 여기까지 들고 내려와야 합니다. 거쳐 가는
  // 곳마다 그 값을 잊지 않고 넘겨야 하는데, 정작 그 값이 필요한 곳은 여기뿐입니다.
  // 12바이트를 다시 읽는 편이 싸고, 이 함수 혼자로도 말이 됩니다.
  const type = await detectImageType(file);

  // 여기서 걸릴 일은 사실상 없습니다. 고를 때 이미 검사했기 때문입니다.
  // 그래도 두는 이유: 이 값이 비면 아래 extension 이 undefined 가 되어
  // "....undefined" 라는 이름의 파일이 조용히 올라갑니다. 그렇게 잘못 저장된
  // 파일은 나중에 화면에서 깨진 그림으로만 드러나 원인을 찾기 어렵습니다.
  if (!type) {
    return { path: '', error: `사진 파일만 올릴 수 있습니다. (${IMAGE_HINT})` };
  }

  const extension = EXTENSION_BY_TYPE[type];

  // 파일 이름을 사용자가 올린 이름 그대로 쓰지 않습니다. 이유가 세 가지입니다.
  //   1) 두 사람이 같은 날 "고양이.jpg" 를 올리면 이름이 부딪힙니다.
  //   2) 한글·공백·특수문자가 든 이름은 주소로 만들 때 깨질 수 있습니다.
  //   3) 파일 이름이 그대로 인터넷에 공개됩니다. ("내 통장사본.jpg" 같은 것도)
  //
  // crypto.randomUUID() 는 브라우저가 만들어주는, 겹치지 않는 긴 문자열입니다.
  //   예) "9b2e4f01-...-7d3a"
  const fileName = `${crypto.randomUUID()}.${extension}`;

  // 앞에 올린 사람의 id 를 폴더로 답니다.
  // 보관함 정책이 "자기 id 폴더에만 올릴 수 있음" 이라 이 모양이어야 통과합니다.
  // (남의 사진을 지우지 못하게 하는 근거이기도 합니다. images.sql 참고)
  const path = `${userId}/${fileName}`;

  // 파일의 "종류 표시" 를 내용에서 알아낸 값으로 고쳐서 올립니다. ★
  //
  // 고쳐야 하는 이유:
  // file.type 은 브라우저가 이름을 보고 짐작한 값입니다. 이름만 cat.png 로 바꾼
  // JPG 파일이라면 "image/png 입니다" 라고 잘못 말하는 셈입니다. 그리고 이 값이
  // 두 곳에서 쓰입니다.
  //   1) 보관함이 받아줄지 판단할 때 (images.sql 의 allowed_mime_types)
  //   2) 나중에 사진을 내려줄 때 붙여 보내는 종류
  // 그래서 그냥 두면 파일 이름은 .jpg 인데 종류는 image/png 로 적힌 파일이 남습니다.
  //
  // upload 의 세 번째 자리에 { contentType } 을 넘기는 방법은 여기서 통하지 않습니다.
  // supabase-js 는 File·Blob 을 올릴 때 그것을 FormData 로 감싸 보내고, 그 경우
  // 종류는 File 자체의 type 에서 가져옵니다. contentType 옵션은 File 이 아닌 것을
  // (문자열이나 스트림) 올릴 때만 쓰입니다.
  //   node_modules/@supabase/storage-js 의 uploadOrUpdate 참고
  //
  // 그래서 옵션이 아니라 파일을 바꿔 넘깁니다. new File 은 같은 내용에 이름과
  // 종류만 새로 붙인 파일을 만들어 줍니다. (원본 file 은 그대로 둡니다)
  const fileToUpload = new File([file], fileName, { type: type });

  const { error } = await supabase.storage.from(BUCKET).upload(path, fileToUpload);

  if (error) {
    console.log('사진 업로드 에러:', error);
    return { path: '', error: '사진 올리기에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  return { path: path, error: '' };
}

// 보관소에서 사진 한 장을 지웁니다.
//
// 성공·실패를 돌려주지 않습니다. 부르는 쪽에서 할 수 있는 일이 없기 때문입니다.
// 이 함수를 부르는 때는 두 가지인데, 둘 다 사진 삭제는 "뒷정리" 입니다.
//   1) 글을 지웠을 때  — 글은 이미 지워졌습니다. 사진 삭제가 실패했다고 해서
//                        "삭제에 실패했습니다" 라고 안내하면 거짓말이 됩니다.
//   2) 사진을 바꿨을 때 — 새 사진은 이미 저장됐습니다.
//
// 실패하면 주인 없는 파일이 보관소에 남습니다. 화면에는 아무 영향이 없고,
// 나중에 관리자가 정리하면 되는 문제라 여기서는 기록만 남깁니다.
export async function removePostImage(imagePath) {
  if (!imagePath) {
    return;
  }

  // remove 는 여러 장을 한 번에 지울 수 있어서 목록(배열)을 받습니다.
  // 우리는 한 장뿐이라 한 칸짜리 목록으로 넘깁니다.
  const { error } = await supabase.storage.from(BUCKET).remove([imagePath]);

  if (error) {
    console.log('사진 삭제 에러:', error);
  }
}

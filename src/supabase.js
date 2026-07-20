import { createClient } from '@supabase/supabase-js';

// .env 파일에 적어둔 값을 읽어옵니다.
// Vite에서는 VITE_ 로 시작하는 이름만 코드에서 쓸 수 있습니다.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 이 supabase 객체로 DB에 요청을 보냅니다.
export const supabase = createClient(url, key);

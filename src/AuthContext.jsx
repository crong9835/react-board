import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatWriter } from './format';

// 로그인한 사용자 정보를 앱 전체에서 나눠 쓰기 위한 통로(Context)
const AuthContext = createContext({ user: null, nickname: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // user 가 null 인 것에는 "로그인 안 함"과 "아직 모름" 두 가지가 섞여 있어서,
  // 이 값으로 둘을 구분합니다.
  const [loading, setLoading] = useState(true);
  // 로그인한 사람의 닉네임. profiles 표에서 따로 가져옵니다.
  const [nickname, setNickname] = useState(null);

  useEffect(() => {
    // 1) 앱이 처음 켜질 때, 지금 로그인된 사람이 있는지 확인
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? data.session.user : null);
      setLoading(false);
    });

    // 2) 로그인/로그아웃이 일어날 때마다 user 값을 자동으로 갱신
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session ? session.user : null);
      },
    );

    // 컴포넌트가 사라질 때 감시를 정리
    return () => listener.subscription.unsubscribe();
  }, []);

  // 로그인한 사람이 바뀔 때마다 그 사람의 닉네임을 가져옵니다.
  //
  // user 객체 전체가 아니라 userId 만 지켜보는 이유: Supabase 가 로그인 상태를
  // 주기적으로 갱신하면서 내용은 그대로인 새 user 객체를 만들어 줍니다.
  // user 를 지켜보면 그때마다 쓸데없이 다시 가져오게 됩니다.
  const userId = user ? user.id : null;
  const userEmail = user ? user.email : null;

  useEffect(() => {
    // 로그인한 사람이 없으면 가져올 것도 없습니다.
    if (!userId) {
      return;
    }

    // 닉네임을 가져오는 동안 사용자가 로그아웃하거나 다른 계정으로 바꿀 수 있습니다.
    // 그러면 뒤늦게 도착한 옛 결과가 새 값을 덮어쓰게 되므로,
    // 이 표시를 두고 "이미 지난 요청이면 결과를 버리도록" 합니다.
    let isOutdated = false;

    async function fetchNickname() {
      // maybeSingle() 은 한 줄만 가져오되, 없으면 에러 대신 null 을 줍니다.
      // 트리거가 만들어지기 전에 가입한 계정은 줄이 없을 수 있습니다.
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userId)
        .maybeSingle();

      if (isOutdated) {
        return;
      }

      // 닉네임 줄이 없는 옛 계정은 이메일 앞부분을 대신 씁니다.
      // 이렇게 해두면 쓰는 쪽에서 "닉네임이 없으면" 을 매번 따지지 않아도 됩니다.
      setNickname(data ? data.nickname : formatWriter(userEmail));
    }

    fetchNickname();

    return () => {
      isOutdated = true;
    };
  }, [userId, userEmail]);

  // 로그아웃하면 위 useEffect 는 아무것도 하지 않으므로 nickname 에는 방금 전
  // 사람의 닉네임이 남아 있습니다. 내보낼 때 한 번 걸러서, 로그인한 사람이 없으면
  // 항상 null 이 나가도록 합니다.
  const currentNickname = user ? nickname : null;

  return (
    <AuthContext.Provider
      value={{ user: user, nickname: currentNickname, loading: loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 로그인한 사용자를 가져옵니다. 로그인 안 했으면 null.
// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  return useContext(AuthContext).user;
}

// 로그인한 사람의 닉네임을 가져옵니다. 로그인 안 했으면 null.
// eslint-disable-next-line react-refresh/only-export-components
export function useNickname() {
  return useContext(AuthContext).nickname;
}

// 아직 로그인 여부를 확인하는 중이면 true
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthLoading() {
  return useContext(AuthContext).loading;
}

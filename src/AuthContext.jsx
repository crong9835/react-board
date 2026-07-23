import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

// 로그인한 사용자 정보를 앱 전체에서 나눠 쓰기 위한 통로(Context)
const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 아직 로그인 여부를 확인하는 중인지 (처음엔 true = 확인 중)
  // user 가 null 인 것에는 "로그인 안 함"과 "아직 모름" 두 가지가 섞여 있어서,
  // 이 값으로 둘을 구분합니다.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) 앱이 처음 켜질 때, 지금 로그인된 사람이 있는지 확인
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? data.session.user : null);
      setLoading(false); // 확인 끝
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

  return (
    <AuthContext.Provider value={{ user: user, loading: loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 어느 컴포넌트에서든 로그인한 사용자를 쉽게 가져오는 함수
// 로그인 안 했으면 null 을 돌려줍니다.
// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  return useContext(AuthContext).user;
}

// 아직 로그인 여부를 확인하는 중이면 true
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthLoading() {
  return useContext(AuthContext).loading;
}

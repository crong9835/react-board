import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

// 로그인한 사용자 정보를 앱 전체에서 나눠 쓰기 위한 통로(Context)
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1) 앱이 처음 켜질 때, 지금 로그인된 사람이 있는지 확인
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? data.session.user : null);
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

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

// 어느 컴포넌트에서든 로그인한 사용자를 쉽게 가져오는 함수
// 로그인 안 했으면 null 을 돌려줍니다.
// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  return useContext(AuthContext);
}

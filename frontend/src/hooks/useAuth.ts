import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, token, isLoading, isInitialized, login, logout, fetchUser, setUser } =
    useAuthStore();

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const hasRole = (role: string | string[]) => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  };

  return {
    user,
    token,
    isLoading,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isTeacher,
    isStudent,
    hasRole,
    login,
    logout,
    fetchUser,
    setUser,
  };
}

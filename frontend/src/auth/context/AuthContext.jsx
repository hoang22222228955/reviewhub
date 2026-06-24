import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { daysLeft } from '../../shared/lib/format'
import { DEFAULT_PLAN_PRIVILEGES } from '../../shared/lib/privileges'

const TOKEN_KEY = 'reviewhub-token'
const USER_CACHE_KEY = 'reviewhub-user'
const AuthContext = createContext(null)

function readUserCache() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // Khởi tạo ngay từ cache để không bị màn hình trắng khi reload
  const [currentUser, setCurrentUser] = useState(() => readUserCache())
  const [loading, setLoading] = useState(true)

  const setUser = useCallback((user) => {
    setCurrentUser(user)
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_CACHE_KEY)
    }
  }, [])

  // Xác thực token với server khi app khởi động
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      api.get('/api/auth/me')
        .then((res) => setUser(res.data))
        .catch((err) => {
          const status = err?.response?.status
          if (status === 401 || status === 403) {
            localStorage.removeItem(TOKEN_KEY)
            setUser(null)
          }
          // Lỗi mạng/server down → giữ nguyên cache
        })
        .finally(() => setLoading(false))
    } else {
      setUser(null)
      setLoading(false)
    }
  }, [setUser])

  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password })
      if (res.data.success) {
        localStorage.setItem(TOKEN_KEY, res.data.token)
        setUser(res.data.user)
        return { success: true, user: res.data.user }
      }
      return { success: false, message: res.data.message }
    } catch (err) {
      const msg = err.response?.data?.message || 'Email hoặc mật khẩu chưa chính xác.'
      return { success: false, message: msg }
    }
  }, [])

  const register = useCallback(async (payload) => {
    try {
      const res = await api.post('/api/auth/register', payload)
      if (res.data.success) {
        localStorage.setItem(TOKEN_KEY, res.data.token)
        setUser(res.data.user)
        return { success: true, user: res.data.user }
      }
      return { success: false, message: res.data.message }
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại.'
      return { success: false, message: msg }
    }
  }, [setUser])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [setUser])

  const updateProfile = useCallback((payload) => {
    if (!currentUser) return
    setUser({ ...currentUser, ...payload })
  }, [currentUser, setUser])

  const purchasePlan = useCallback(async (planId) => {
    if (!currentUser) return { success: false, message: 'Bạn cần đăng nhập.' }
    try {
      const res = await api.post('/api/partner/purchase-plan', { planId })
      if (res.data.success) {
        setUser(res.data.user)
        return { success: true }
      }
      return { success: false, message: res.data.error || 'Mua gói thất bại.' }
    } catch (err) {
      return { success: false, message: err.response?.data?.error || 'Lỗi kết nối.' }
    }
  }, [currentUser, setUser])

  const cancelPlan = useCallback(async () => {
    try {
      const res = await api.post('/api/partner/cancel-plan')
      if (res.data.success) {
        setUser(res.data.user)
        return { success: true }
      }
      return { success: false, message: res.data.error || 'Hủy gói thất bại.' }
    } catch {
      setUser({ ...currentUser, currentPlanId: null, planActivatedAt: null, planExpiresAt: null, quotaTotal: 0, quotaUsed: 0, membershipLabel: null })
      return { success: true }
    }
  }, [currentUser, setUser])

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me')
      setUser(res.data)
      return res.data
    } catch {
      return null
    }
  }, [setUser])

  const consumeQuota = useCallback((amount = 1) => {
    if (!currentUser) return
    setUser({
      ...currentUser,
      quotaUsed: Math.min(currentUser.quotaTotal || 0, (currentUser.quotaUsed || 0) + amount),
    })
  }, [currentUser, setUser])

  const uploadLogo = useCallback(async (logoBase64) => {
    try {
      const res = await api.post('/api/partner/upload-logo', { logoBase64 })
      if (res.data.success) {
        setUser(res.data.user)
        return { success: true }
      }
      return { success: false, message: res.data.error || 'Upload thất bại.' }
    } catch (err) {
      return { success: false, message: err.response?.data?.error || 'Lỗi kết nối.' }
    }
  }, [setUser])

  const submitPayment = useCallback(async (planId, qty, paymentMethod) => {
    if (!currentUser) return { success: false, message: 'Bạn cần đăng nhập.' }
    try {
      const res = await api.post('/api/partner/submit-payment', { planId, qty, paymentMethod })
      return res.data
    } catch (err) {
      return { success: false, message: err.response?.data?.error || 'Lỗi kết nối.' }
    }
  }, [currentUser])

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      setUser,
      daysRemaining: currentUser?.planExpiresAt ? daysLeft(currentUser.planExpiresAt) : 0,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
      purchasePlan,
      cancelPlan,
      consumeQuota,
      uploadLogo,
      submitPayment,
      /**
       * Kiểm tra partner hiện tại có privilege key không.
       * Ưu tiên privileges lấy từ plan trong currentUser, fallback về DEFAULT_PLAN_PRIVILEGES.
       */
      hasPrivilege(key) {
        const planId = currentUser?.currentPlanId
        if (!planId) return false
        // Backend có thể trả về planPrivileges trong user dto
        const privs = currentUser?.planPrivileges ?? DEFAULT_PLAN_PRIVILEGES[planId] ?? []
        return privs.includes(key)
      },
    }),
    [currentUser, loading, setUser, login, register, logout, updateProfile, refreshUser, purchasePlan, cancelPlan, consumeQuota, uploadLogo, submitPayment]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

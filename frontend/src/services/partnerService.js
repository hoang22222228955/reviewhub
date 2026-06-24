import api from './api';

export function buildApiKeys(userId) {
  const tail = String(userId || 'guest').slice(-6);
  return {
    sandbox: `rh_sandbox_${tail}_4G8K`,
    live: `rh_live_${tail}_9L2Z`,
  };
}

export function getUsageLogs() {
  return [];
}

/**
 * Lấy lịch sử gọi API thật từ backend bằng X-Api-Key.
 * @param {string} apiKey - Live API key của partner
 * @param {number} limit  - Số bản ghi muốn lấy (mặc định 20)
 */
export async function fetchUsageLogs(apiKey, limit = 20) {
  if (!apiKey) return [];
  try {
    const res = await api.get(`/api/v1/usage-logs?limit=${limit}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    return res.data?.data || [];
  } catch {
    return [];
  }
}

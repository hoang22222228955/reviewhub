import api from './api';
import { DEFAULT_PLANS } from '../shared/lib/defaultData';
import { readJson, writeJson } from '../shared/lib/storage';

const KEY = 'reviewhub-plans-v3';

function seed() {
  if (!readJson(KEY, null)) {
    writeJson(KEY, DEFAULT_PLANS);
  }
}

/** Lấy plans từ cache localStorage (dùng offline / fallback) */
export function getPlans() {
  seed();
  return readJson(KEY, DEFAULT_PLANS);
}

export function getPlanById(planId) {
  return getPlans().find((item) => item.id === planId) || null;
}

/** Fetch plans từ API backend (realtime từ DB) */
export async function fetchPlans() {
  try {
    const res = await api.get('/api/plans');
    // Map field names từ backend về format frontend
    const plans = res.data.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      quota: p.quotaLimit,
      durationDays: p.durationDays,
      cycle: p.cycle,
      status: p.status,
      featured: p.featured,
      description: p.description,
      features: p.features || [],
      privileges: p.privileges || [],
    }));
    // Cập nhật cache
    writeJson(KEY, plans);
    return plans;
  } catch {
    return getPlans();
  }
}

/** Admin lưu thay đổi gói lên DB qua API */
export async function savePlan(planId, payload) {
  const res = await api.put(`/api/admin/plans/${planId}`, {
    name: payload.name,
    price: payload.price,
    quotaLimit: payload.quota,
    durationDays: payload.durationDays,
    cycle: payload.cycle,
    status: payload.status,
    featured: payload.featured,
    description: payload.description,
    features: payload.features,
    privileges: payload.privileges,
  });
  return res.data;
}

export function updatePlan(planId, payload) {
  const next = getPlans().map((plan) =>
    plan.id === planId ? { ...plan, ...payload, updatedAt: new Date().toISOString() } : plan
  );
  writeJson(KEY, next);
  return next;
}


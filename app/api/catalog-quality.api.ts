import type { ApiClient } from './transport.api';
import type { QualityStop, QualitySummary, QualityAudit } from '../types/domain/catalog-quality';

const base = '/admin/catalog-quality';
function stopPath(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Некорректный идентификатор остановки');
  return `${base}/stops/${id}`;
}
export function createCatalogQualityApi(api: ApiClient) {
  return {
    summary: (signal?: AbortSignal) => api<QualitySummary>(`${base}/summary`, { signal }),
    queue: (q = '', cursor?: string, signal?: AbortSignal) => api<{ items: QualityStop[]; next_cursor: string | null }>(`${base}/stops?${new URLSearchParams({ q, limit: '30', ...(cursor ? { cursor } : {}) })}`, { signal }),
    mapping: (id: number, body: { city_id: number; version: string; reason: string }) => api<QualityStop>(`${stopPath(id)}/mapping`, { method: 'POST', body, retry: 0 }),
    history: (id: number, signal?: AbortSignal) => api<{ items: QualityAudit[] }>(`${stopPath(id)}/history?limit=20`, { signal }),
  };
}

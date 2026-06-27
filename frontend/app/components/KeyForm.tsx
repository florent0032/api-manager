"use client";

import { useState } from "react";
import { Supplier, ApiKey } from "@/lib/api";

interface Props {
  supplier: Supplier;
  apiKey: ApiKey | null;
  onSave: (data: Partial<ApiKey>) => void;
  onClose: () => void;
}

const inputCls = "w-full bg-[#0a0a12] border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm text-[#e4e4e7] placeholder:text-[#52525b] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all";
const labelCls = "block text-xs text-[#a1a1aa] mb-1.5 font-medium";

export default function KeyForm({ supplier, apiKey, onSave, onClose }: Props) {
  const [key, setKey] = useState(apiKey?.api_key || "");
  const [baseUrl, setBaseUrl] = useState(apiKey?.base_url || supplier.base_urls[0] || "");
  const [expireAt, setExpireAt] = useState(() => {
    if (apiKey?.expire_at) return apiKey.expire_at.split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [remaining, setRemaining] = useState(String(apiKey?.remaining ?? 10));
  const [notes, setNotes] = useState(apiKey?.notes || "");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await onSave({
        api_key: key,
        base_url: baseUrl,
        expire_at: expireAt ? new Date(expireAt).toISOString() : undefined,
        remaining: parseFloat(remaining) || 10,
        notes,
      });
    } catch (err: any) {
      setError(err.message || "操作失败");
    }
  };

  const selectCls = "w-full bg-[#0a0a12] border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm text-[#e4e4e7] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111118] border border-[#1e1e2a] rounded-2xl w-[90%] max-w-lg shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-[#1e1e2a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">
              {apiKey ? "编辑密钥" : "添加密钥"}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717a] hover:text-white hover:bg-[#1e1e2a] transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* API Key */}
          <div>
            <label className={labelCls}>API Key *</label>
            <div className="flex gap-2">
              <input
                className={inputCls + " font-mono flex-1"}
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(""); }}
                required
                placeholder="tp-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    const decoded = atob(key.trim());
                    setKey(decoded);
                    setError("");
                  } catch {
                    setError("Base64 解码失败，请检查输入内容");
                  }
                }}
                className="shrink-0 px-3 py-2.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                title="Base64 解码"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                B64解码
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className={labelCls}>Base URL *</label>
            <div className="relative">
              <select className={selectCls} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required>
                {supplier.base_urls.map((url, i) => (
                  <option key={i} value={url}>{url}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Expire + Remaining */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>到期时间</label>
              <input className={inputCls} type="date" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>余量 (B)</label>
              <input className={inputCls} type="number" step="0.01" value={remaining} onChange={(e) => setRemaining(e.target.value)} placeholder="10" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>备注</label>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="可选备注信息" />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#1e1e2a]">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#a1a1aa] border border-[#2a2a3a] hover:bg-[#1a1a2a] hover:text-white transition-all">
              取消
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all">
              {apiKey ? "保存修改" : "添加密钥"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

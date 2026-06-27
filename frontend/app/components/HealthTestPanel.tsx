"use client";

import { useState, useEffect } from "react";
import { api, Supplier, ApiKey, HealthTestResponse } from "@/lib/api";

interface Props {
  suppliers: Supplier[];
  showToast: (msg: string) => void;
}

export default function HealthTestPanel({ suppliers, showToast }: Props) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    suppliers[0]?.id || null
  );
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [selectedKeyIds, setSelectedKeyIds] = useState<number[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<HealthTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["healthy", "frequent", "unhealthy", "unknown"]);

  const supplier = suppliers.find((s) => s.id === selectedSupplierId);

  useEffect(() => {
    if (!selectedSupplierId) return;
    setLoading(true);
    api.listKeys(selectedSupplierId).then((data) => {
      setKeys(data);
      setSelectedKeyIds(data.map((k) => k.id));
      setLoading(false);
    });
  }, [selectedSupplierId]);

  useEffect(() => {
    if (supplier) {
      setSelectedModels(
        supplier.default_model ? [supplier.default_model] : supplier.available_models.slice(0, 1)
      );
    }
  }, [supplier]);

  const handleTest = async () => {
    if (!selectedSupplierId || selectedKeyIds.length === 0) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await api.healthTest({
        supplier_id: selectedSupplierId,
        key_ids: selectedKeyIds,
        models: selectedModels,
      });
      setResult(res);
      showToast(`测试完成: ${res.healthy} 可用, ${res.frequent} 频繁, ${res.unhealthy} 不可用`);
    } catch (e: any) {
      showToast(`测试失败: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((x) => x !== status) : [...prev, status]
    );
  };

  const filteredKeys = keys.filter((k) => selectedStatuses.includes(k.status));

  const toggleKey = (id: number) => {
    setSelectedKeyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const filteredIds = filteredKeys.map((k) => k.id);
    if (selectedKeyIds.length === filteredIds.length &&
        filteredIds.every(id => selectedKeyIds.includes(id))) {
      setSelectedKeyIds([]);
    } else {
      setSelectedKeyIds(filteredIds);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">健康测试</h2>
        <p className="text-sm text-[#71717a]">批量测试 API 密钥的可用性</p>
      </div>

      {/* Controls */}
      <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5 mb-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Supplier select */}
          <div>
            <label className="text-xs text-[#71717a] mb-2 block font-medium">选择供应商</label>
            <div className="relative">
              <select
                value={selectedSupplierId || ""}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="w-full bg-[#0a0a12] border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm text-[#e4e4e7] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer appearance-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.key_count} 个密钥)
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Model select */}
          <div>
            <label className="text-xs text-[#71717a] mb-2 block">测试模型</label>
            <div className="flex flex-wrap gap-2">
              {supplier?.available_models.map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setSelectedModels((prev) =>
                      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
                    )
                  }
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    selectedModels.includes(m)
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "bg-[#0a0a12] text-[#71717a] border border-[#1e1e2a] hover:border-[#2a2a3a]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status filter */}
        <div className="mt-4">
          <label className="text-xs text-[#71717a] mb-2 block font-medium">按状态筛选</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "healthy", label: "可用", color: "green" },
              { value: "frequent", label: "频繁", color: "amber" },
              { value: "unhealthy", label: "不可用", color: "red" },
              { value: "unknown", label: "未知", color: "gray" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => toggleStatus(s.value)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedStatuses.includes(s.value)
                    ? s.color === "green"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : s.color === "amber"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : s.color === "red"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                    : "bg-[#0a0a12] text-[#71717a] border border-[#1e1e2a] hover:border-[#2a2a3a]"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  s.color === "green" ? "bg-green-500" :
                  s.color === "amber" ? "bg-amber-500" :
                  s.color === "red" ? "bg-red-500" :
                  "bg-gray-500"
                }`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key selection */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[#71717a]">
              选择密钥 <span className="text-[#52525b]">({filteredKeys.length}/{keys.length})</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))}
                className="flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-white transition-colors"
                title={sortOrder === "newest" ? "最新在前" : "最早在前"}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sortOrder === "newest" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  )}
                </svg>
                {sortOrder === "newest" ? "最新" : "最早"}
              </button>
              <button onClick={toggleAll} className="text-xs text-indigo-400 hover:text-indigo-300">
                {selectedKeyIds.length === filteredKeys.length && filteredKeys.length > 0 ? "取消全选" : "全选"}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-xs text-[#71717a] py-4">加载中...</div>
          ) : filteredKeys.length === 0 ? (
            <div className="text-xs text-[#71717a] py-4 text-center">没有符合条件的密钥</div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {[...filteredKeys].sort((a, b) => {
                const ta = new Date(a.created_at).getTime();
                const tb = new Date(b.created_at).getTime();
                return sortOrder === "newest" ? tb - ta : ta - tb;
              }).map((k) => (
                <label
                  key={k.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#0a0a12] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeyIds.includes(k.id)}
                    onChange={() => toggleKey(k.id)}
                    className="rounded"
                  />
                  <div className={`w-2 h-2 rounded-full ${
                    k.status === "healthy" ? "bg-green-500" :
                    k.status === "unhealthy" ? "bg-red-500" :
                    k.status === "frequent" ? "bg-amber-500" : "bg-gray-500"
                  }`} />
                  <code className="text-xs text-[#a1a1aa] font-mono">
                    {k.api_key.slice(0, 16)}...{k.api_key.slice(-6)}
                  </code>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                    k.status === "healthy" ? "bg-green-500/15 text-green-400" :
                    k.status === "unhealthy" ? "bg-red-500/15 text-red-400" :
                    k.status === "frequent" ? "bg-amber-500/15 text-amber-400" :
                    "bg-gray-500/15 text-gray-400"
                  }`}>
                    {k.status === "healthy" ? "可用" :
                     k.status === "unhealthy" ? "不可用" :
                     k.status === "frequent" ? "频繁" : "未知"}
                  </span>
                  <span className="text-xs text-[#71717a] ml-auto">
                    {k.base_url.includes("cn") ? "CN" : "SGP"}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Test button */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleTest}
            disabled={testing || selectedKeyIds.length === 0 || selectedModels.length === 0}
            className="btn btn-primary"
          >
            {testing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                测试中... ({selectedKeyIds.length} 个密钥)
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                开始测试 ({selectedKeyIds.length} 个密钥)
              </>
            )}
          </button>
          <span className="text-xs text-[#71717a]">
            已选 {selectedKeyIds.length}/{filteredKeys.length} 个密钥, {selectedModels.length} 个模型
          </span>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="animate-fade-in">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{result.total}</div>
              <div className="text-xs text-[#71717a]">总计</div>
            </div>
            <div className="bg-[#111118] border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{result.healthy}</div>
              <div className="text-xs text-[#71717a]">可用</div>
            </div>
            <div className="bg-[#111118] border border-amber-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{result.frequent}</div>
              <div className="text-xs text-[#71717a]">频繁</div>
            </div>
            <div className="bg-[#111118] border border-red-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{result.unhealthy}</div>
              <div className="text-xs text-[#71717a]">不可用</div>
            </div>
          </div>

          {/* Result list */}
          <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_100px_200px] gap-4 px-5 py-3 border-b border-[#1e1e2a] text-xs text-[#71717a] font-medium">
              <span>密钥</span>
              <span>状态</span>
              <span>延迟</span>
              <span>错误信息</span>
            </div>
            {result.results.map((r) => (
              <div
                key={r.key_id}
                className="grid grid-cols-[1fr_100px_100px_200px] gap-4 px-5 py-3 border-b border-[#1e1e2a] last:border-0 items-center"
              >
                <code className="text-sm text-[#a1a1aa] font-mono">{r.api_key_mask}</code>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium w-fit ${
                    r.status === "healthy" ? "badge-healthy" :
                    r.status === "frequent" ? "badge-frequent" : "badge-unhealthy"
                  }`}
                >
                  {r.status === "healthy" ? "可用" : r.status === "frequent" ? "频繁" : "不可用"}
                </span>
                <span className="text-sm text-[#a1a1aa]">
                  {r.latency_ms ? `${r.latency_ms}ms` : "-"}
                </span>
                <span className="text-xs text-red-400 truncate" title={r.error || ""}>
                  {r.error || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

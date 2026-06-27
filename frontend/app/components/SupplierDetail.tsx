"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Supplier, ApiKey, HealthTestResponse } from "@/lib/api";
import KeyForm from "./KeyForm";
import KeyDetailModal from "./KeyDetailModal";
import ConfirmModal from "./ConfirmModal";

interface Props {
  supplier: Supplier;
  onEdit: () => void;
  onRefresh: () => void;
  showToast: (msg: string) => void;
}

export default function SupplierDetail({ supplier, onEdit, onRefresh, showToast }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<HealthTestResponse | null>(null);
  const [testModels, setTestModels] = useState<string[]>([]);
  const [selectedKeyIds, setSelectedKeyIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => void;
  } | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await api.listKeys(supplier.id, filterStatus || undefined);
      setKeys(data);
    } catch (e: any) {
      showToast(`加载密钥失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [supplier.id, filterStatus, showToast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  useEffect(() => {
    setTestModels(supplier.default_model ? [supplier.default_model] : supplier.available_models.slice(0, 1));
  }, [supplier]);

  const handleCreateKey = () => {
    setEditingKey(null);
    setShowKeyForm(true);
  };

  const handleEditKey = (key: ApiKey) => {
    setEditingKey(key);
    setShowKeyForm(true);
  };

  const handleSaveKey = async (data: Partial<ApiKey>) => {
    if (editingKey) {
      await api.updateKey(editingKey.id, data);
      showToast("密钥已更新");
    } else {
      await api.createKey({ ...data, supplier_id: supplier.id } as any);
      showToast("密钥已添加");
    }
    setShowKeyForm(false);
    loadKeys();
    onRefresh();
  };

  const handleDeleteKey = (id: number) => {
    const key = keys.find(k => k.id === id);
    const keyMask = key ? `${key.api_key.slice(0, 12)}...${key.api_key.slice(-8)}` : "该密钥";

    setConfirmModal({
      title: "删除密钥",
      message: `确定要删除密钥 ${keyMask} 吗？此操作不可撤销。`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.deleteKey(id);
          showToast("密钥已删除");
          loadKeys();
          onRefresh();
        } catch (e: any) {
          showToast(`删除失败: ${e.message}`);
        }
        setConfirmModal(null);
      },
    });
  };

  const handleToggleKey = (id: number) => {
    setSelectedKeyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedKeyIds.length === filteredKeys.length) {
      setSelectedKeyIds([]);
    } else {
      setSelectedKeyIds(filteredKeys.map((k) => k.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedKeyIds.length === 0) return;

    setConfirmModal({
      title: "批量删除密钥",
      message: `确定要删除选中的 ${selectedKeyIds.length} 个密钥吗？此操作不可撤销。`,
      variant: "danger",
      onConfirm: async () => {
        setDeleting(true);
        try {
          const result = await api.batchDeleteKeys(selectedKeyIds);
          showToast(`成功删除 ${result.deleted_count} 个密钥`);
          setSelectedKeyIds([]);
          loadKeys();
          onRefresh();
        } catch (e: any) {
          showToast(`批量删除失败: ${e.message}`);
        } finally {
          setDeleting(false);
        }
        setConfirmModal(null);
      },
    });
  };

  const handleHealthTest = async (keyIds?: number[]) => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.healthTest({
        supplier_id: supplier.id,
        key_ids: keyIds || keys.map((k) => k.id),
        models: testModels,
      });
      setTestResult(result);
      showToast(`测试完成: ${result.healthy} 可用, ${result.frequent} 频繁, ${result.unhealthy} 不可用`);
      loadKeys();
      onRefresh();
    } catch (e: any) {
      showToast(`测试失败: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleTestSingle = (key: ApiKey) => {
    handleHealthTest([key.id]);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      healthy: { cls: "badge-healthy", label: "可用" },
      unhealthy: { cls: "badge-unhealthy", label: "不可用" },
      frequent: { cls: "badge-frequent", label: "频繁" },
      testing: { cls: "badge-testing", label: "测试中" },
      unknown: { cls: "badge-unknown", label: "未知" },
    };
    const s = map[status] || map.unknown;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const formatDate = (date: string | null) => {
    if (!date) return "无";
    const d = new Date(date);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = d.toLocaleDateString("zh-CN");
    if (diff < 0) return `${dateStr} (已过期)`;
    if (diff === 0) return `${dateStr} (今天到期)`;
    return `${dateStr} (${diff}天)`;
  };

  const filteredKeys = keys
    .filter((k) => {
      if (filterStatus && k.status !== filterStatus) return false;
      if (searchQuery && !k.api_key.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">{supplier.name}</h2>
            <button onClick={onEdit} className="px-2.5 py-1 rounded-md text-xs text-[#a1a1aa] border border-[#2a2a3a] hover:bg-[#1a1a2a] hover:text-white transition-all flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              编辑
            </button>
          </div>
          <p className="text-sm text-[#71717a] mb-2">{supplier.description}</p>
          {/* Quick links */}
          <div className="flex items-center gap-3">
            {supplier.docs_url && (
              <a
                href={supplier.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                📖 文档官网
              </a>
            )}
            {supplier.workbench_url && (
              <a
                href={supplier.workbench_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                🌐 官网工作台
              </a>
            )}
          </div>
        </div>
        <button onClick={handleCreateKey} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加密钥
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-4">
          <div className="text-xs text-[#71717a] mb-2">Base URLs</div>
          <div className="space-y-1">
            {supplier.base_urls.map((url, i) => (
              <div key={i} className="text-xs text-[#a1a1aa] font-mono truncate">{url}</div>
            ))}
          </div>
        </div>
        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-4">
          <div className="text-xs text-[#71717a] mb-2">可用模型</div>
          <div className="flex flex-wrap gap-1">
            {supplier.available_models.map((m, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-4">
          <div className="text-xs text-[#71717a] mb-2">密钥统计</div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{keys.length}</div>
              <div className="text-[11px] text-[#71717a]">总计</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{keys.filter((k) => k.status === "healthy").length}</div>
              <div className="text-[11px] text-[#71717a]">可用</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{keys.filter((k) => k.status === "frequent").length}</div>
              <div className="text-[11px] text-[#71717a]">频繁</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{keys.filter((k) => k.status === "unhealthy").length}</div>
              <div className="text-[11px] text-[#71717a]">不可用</div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Test Bar */}
      <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-white mb-2">批量健康测试</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#71717a]">测试模型:</span>
              {supplier.available_models.map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setTestModels((prev) =>
                      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
                    )
                  }
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-all ${
                    testModels.includes(m)
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "bg-[#0a0a12] text-[#71717a] border border-[#1e1e2a] hover:border-[#2a2a3a]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleHealthTest()}
            disabled={testing || testModels.length === 0}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-green-400 bg-green-500/10 border border-green-500/25 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {testing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                测试中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                测试全部
              </>
            )}
          </button>
        </div>
        {testResult && (
          <div className="mt-3 pt-3 border-t border-[#1e1e2a] flex items-center gap-4 text-sm">
            <span className="text-[#71717a]">测试结果:</span>
            <span className="text-green-400">{testResult.healthy} 可用</span>
            <span className="text-red-400">{testResult.unhealthy} 不可用</span>
            <span className="text-[#71717a]">共 {testResult.total} 个</span>
          </div>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索 API Key..."
            className="w-full bg-[#0a0a12] border border-[#2a2a3a] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e4e4e7] placeholder:text-[#52525b] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-[#71717a] hover:text-white hover:bg-[#2a2a3a] transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status filter */}
        <span className="text-xs text-[#71717a]">状态:</span>
        {["", "healthy", "unhealthy", "frequent", "unknown"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === s
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25"
                : "bg-[#111118] text-[#71717a] border border-[#1e1e2a] hover:border-[#2a2a3a]"
            }`}
          >
            {s === "" ? "全部" : s === "healthy" ? "可用" : s === "unhealthy" ? "不可用" : s === "frequent" ? "频繁" : "未知"}
          </button>
        ))}
        <span className="text-xs text-[#71717a] ml-auto">{filteredKeys.length} 个密钥</span>

        {/* Sort */}
        <button
          onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#111118] text-[#a1a1aa] border border-[#1e1e2a] hover:border-[#2a2a3a] transition-all"
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
      </div>

      {/* Batch Actions Bar */}
      {filteredKeys.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedKeyIds.length === filteredKeys.length && filteredKeys.length > 0}
              onChange={handleToggleAll}
              className="rounded border-[#2a2a3a] bg-[#0a0a12] text-indigo-500 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-[#a1a1aa]">
              {selectedKeyIds.length === filteredKeys.length ? "取消全选" : "全选"}
            </span>
          </label>
          {selectedKeyIds.length > 0 && (
            <>
              <span className="text-xs text-[#71717a]">已选 {selectedKeyIds.length} 个</span>
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    删除中...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    批量删除
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="text-center py-12 text-[#71717a]">加载中...</div>
      ) : filteredKeys.length === 0 ? (
        <div className="text-center py-12 text-[#71717a]">暂无密钥</div>
      ) : (
        <div className="space-y-2">
          {filteredKeys.map((key) => (
            <div
              key={key.id}
              className={`bg-[#111118] border rounded-xl p-4 transition-all group cursor-pointer ${
                selectedKeyIds.includes(key.id)
                  ? "border-indigo-500/50 bg-indigo-500/5"
                  : "border-[#1e1e2a] hover:border-[#2a2a3e]"
              }`}
              onClick={() => setSelectedKey(key)}
            >
              <div className="flex items-center gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedKeyIds.includes(key.id)}
                  onChange={(e) => { e.stopPropagation(); handleToggleKey(key.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-[#2a2a3a] bg-[#0a0a12] text-indigo-500 focus:ring-indigo-500/20 shrink-0"
                />

                {/* Status indicator */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  key.status === "healthy" ? "bg-green-500" :
                  key.status === "unhealthy" ? "bg-red-500" :
                  key.status === "frequent" ? "bg-amber-500" :
                  key.status === "testing" ? "bg-yellow-500 animate-pulse" :
                  "bg-gray-500"
                }`} />

                {/* Key info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm text-[#e4e4e7] font-mono">
                      {key.api_key.slice(0, 12)}...{key.api_key.slice(-8)}
                    </code>
                    {statusBadge(key.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#71717a]">
                    <span className="font-mono truncate max-w-[200px]">
                      {key.base_url.replace("https://", "").split("/")[0]}
                    </span>
                    <span>·</span>
                    <span className={isExpired(key.expire_at) ? "text-red-400" : ""}>
                      {formatDate(key.expire_at)}
                    </span>
                    <span>·</span>
                    <span>{key.remaining}B 余量</span>
                    <span>·</span>
                    <span>{new Date(key.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    {key.test_latency_ms && (
                      <>
                        <span>·</span>
                        <span>{key.test_latency_ms}ms</span>
                      </>
                    )}
                  </div>
                  {key.notes && (
                    <div className="text-xs text-[#71717a] mt-1 truncate">{key.notes}</div>
                  )}
                  {key.test_error && key.status !== "healthy" && (
                    <div className={`text-[11px] mt-1.5 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 max-w-full ${
                      key.status === "frequent"
                        ? "bg-amber-500/10 text-amber-400/80 border border-amber-500/15"
                        : "bg-red-500/10 text-red-400/80 border border-red-500/15"
                    }`}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="truncate">{key.test_error}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTestSingle(key); }}
                    className="p-1.5 rounded-md text-[#71717a] hover:text-green-400 hover:bg-green-500/10 transition-all"
                    title="测试"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditKey(key); }}
                    className="p-1.5 rounded-md text-[#71717a] hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                    title="编辑"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteKey(key.id); }}
                    className="p-1.5 rounded-md text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="删除"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Form Modal */}
      {showKeyForm && (
        <KeyForm
          supplier={supplier}
          apiKey={editingKey}
          onSave={handleSaveKey}
          onClose={() => setShowKeyForm(false)}
        />
      )}

      {/* Key Detail Modal */}
      {selectedKey && (
        <KeyDetailModal
          supplier={supplier}
          apiKey={selectedKey}
          onClose={() => setSelectedKey(null)}
          showToast={showToast}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          confirmText="删除"
          cancelText="取消"
        />
      )}
    </div>
  );
}

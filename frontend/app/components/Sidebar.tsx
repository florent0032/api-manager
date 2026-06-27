"use client";

import { Supplier } from "@/lib/api";

type View = "dashboard" | "supplier" | "health-test";

interface Props {
  suppliers: Supplier[];
  selectedId: number | null;
  view: View;
  onSelectSupplier: (id: number) => void;
  onSelectDashboard: () => void;
  onSelectHealthTest: () => void;
  onCreateSupplier: () => void;
  onDeleteSupplier: (id: number) => void;
  loading: boolean;
}

export default function Sidebar({
  suppliers,
  selectedId,
  view,
  onSelectSupplier,
  onSelectDashboard,
  onSelectHealthTest,
  onCreateSupplier,
  onDeleteSupplier,
  loading,
}: Props) {
  return (
    <aside className="w-64 shrink-0 h-screen overflow-y-auto border-r border-[#1e1e2a] bg-[#0d0d14] flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-[#1e1e2a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">API Manager</h1>
            <p className="text-[11px] text-[#71717a]">密钥管理系统</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={onSelectDashboard}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
            view === "dashboard"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              : "text-[#a1a1aa] hover:bg-[#1a1a2a] hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          仪表盘
        </button>

        <button
          onClick={onSelectHealthTest}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
            view === "health-test"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              : "text-[#a1a1aa] hover:bg-[#1a1a2a] hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          健康测试
        </button>

        {/* Suppliers */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">
              供应商
            </span>
            <button
              onClick={onCreateSupplier}
              className="w-6 h-6 rounded-md bg-[#1e1e2a] hover:bg-indigo-500/20 text-[#71717a] hover:text-indigo-400 flex items-center justify-center transition-all"
              title="添加供应商"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-center text-[#71717a] text-xs">加载中...</div>
          ) : suppliers.length === 0 ? (
            <div className="px-3 py-4 text-center text-[#71717a] text-xs">暂无供应商</div>
          ) : (
            suppliers.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  view === "supplier" && selectedId === s.id
                    ? "bg-indigo-500/10 border border-indigo-500/20"
                    : "hover:bg-[#1a1a2a]"
                }`}
                onClick={() => onSelectSupplier(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm truncate ${
                      view === "supplier" && selectedId === s.id
                        ? "text-indigo-400"
                        : "text-[#e4e4e7]"
                    }`}
                  >
                    {s.name}
                  </div>
                  <div className="text-[11px] text-[#71717a]">
                    {s.healthy_key_count}/{s.key_count} 可用
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSupplier(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="删除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e1e2a]">
        <div className="text-[11px] text-[#71717a] text-center">
          API Manager v1.0
        </div>
      </div>
    </aside>
  );
}

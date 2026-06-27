"use client";

import { Supplier } from "@/lib/api";

interface Props {
  suppliers: Supplier[];
  onSelectSupplier: (id: number) => void;
}

export default function Dashboard({ suppliers, onSelectSupplier }: Props) {
  const totalKeys = suppliers.reduce((a, s) => a + s.key_count, 0);
  const healthyKeys = suppliers.reduce((a, s) => a + s.healthy_key_count, 0);

  const stats = [
    { label: "供应商", value: suppliers.length, color: "from-indigo-500 to-purple-600" },
    { label: "总密钥", value: totalKeys, color: "from-blue-500 to-cyan-500" },
    { label: "可用密钥", value: healthyKeys, color: "from-green-500 to-emerald-500" },
    { label: "不可用", value: totalKeys - healthyKeys, color: "from-red-500 to-orange-500" },
  ];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">仪表盘</h2>
        <p className="text-sm text-[#71717a]">API 密钥管理概览</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5 hover:border-[#2a2a3e] transition-colors"
          >
            <div className="text-xs text-[#71717a] mb-2">{s.label}</div>
            <div className={`text-3xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Cards */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-4">供应商列表</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSupplier(s.id)}
              className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-base font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    {s.name}
                  </h4>
                  <p className="text-xs text-[#71717a] mt-1">{s.description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs text-green-400">
                    {s.healthy_key_count}/{s.key_count}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {s.base_urls.map((url, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-[#0a0a12] border border-[#1e1e2a] text-[#a1a1aa] truncate max-w-[200px]"
                  >
                    {url.replace("https://", "").split("/")[0]}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#71717a]">
                <span>模型: {s.available_models.length}</span>
                <span>·</span>
                <span>默认: {s.default_model || "无"}</span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-[#0a0a12] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{
                    width: s.key_count > 0 ? `${(s.healthy_key_count / s.key_count) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

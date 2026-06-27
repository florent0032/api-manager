"use client";

import { useState } from "react";
import { Supplier, ApiKey } from "@/lib/api";

interface Props {
  supplier: Supplier;
  apiKey: ApiKey;
  onClose: () => void;
  showToast: (msg: string) => void;
}

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="bg-[#0a0a12] border border-[#1e1e2a] rounded-lg p-3 pr-20 font-mono text-[13px] text-[#a1a1aa] leading-relaxed whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
        {text}
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-[#1e1e2e] border border-[#2a2a3a] text-[#a1a1aa] hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30"
      >
        {copied ? "✓ 已复制" : label}
      </button>
    </div>
  );
}

export default function KeyDetailModal({ supplier, apiKey, onClose }: Props) {
  const fillTemplate = (template: string) => {
    return template
      .replace(/\{base_url\}/g, apiKey.base_url)
      .replace(/\{api_key\}/g, apiKey.api_key)
      .replace(/\{model\}/g, supplier.default_model || supplier.available_models[0] || "mimo-v2.5-pro");
  };

  const codexConfig = fillTemplate(supplier.codex_template);
  const claudeConfig = fillTemplate(supplier.claude_template);

  const isExpired = apiKey.expire_at ? new Date(apiKey.expire_at) < new Date() : false;
  const statusMap: Record<string, { bg: string; text: string; border: string; label: string }> = {
    healthy: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", label: "可用" },
    unhealthy: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", label: "不可用" },
    frequent: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", label: "频繁" },
    testing: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", label: "测试中" },
    unknown: { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30", label: "未知" },
  };
  const st = statusMap[apiKey.status] || statusMap.unknown;

  const InfoCell = ({ label, value, danger }: { label: string; value: string; danger?: boolean }) => (
    <div className="bg-[#0a0a12] border border-[#1e1e2a] rounded-lg p-3">
      <div className="text-[11px] text-[#71717a] mb-1">{label}</div>
      <div className={`text-sm font-mono ${danger ? "text-red-400" : "text-[#e4e4e7]"}`}>{value}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#111118] border border-[#1e1e2a] rounded-2xl w-[90%] max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/50 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#111118]/95 backdrop-blur-sm border-b border-[#1e1e2a] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">密钥详情</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${st.bg} ${st.text} ${st.border}`}>
                  {st.label}
                </span>
                <span className="text-[11px] text-[#71717a]">
                  {apiKey.test_latency_ms ? `${apiKey.test_latency_ms}ms` : ""}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717a] hover:text-white hover:bg-[#1e1e2a] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* API Key with copy */}
          <div>
            <div className="text-xs text-[#71717a] mb-2 font-medium">API Key</div>
            <CopyBlock text={apiKey.api_key} label="复制 Key" />
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3">
            <InfoCell label="Base URL" value={apiKey.base_url.replace("https://", "")} />
            <InfoCell
              label="到期时间"
              value={
                apiKey.expire_at
                  ? `${new Date(apiKey.expire_at).toLocaleDateString("zh-CN")}${isExpired ? " (已过期)" : ""}`
                  : "无"
              }
              danger={isExpired}
            />
            <InfoCell label="余量" value={`${apiKey.remaining}B tokens`} />
          </div>
          {apiKey.notes && (
            <InfoCell label="备注" value={apiKey.notes} />
          )}

          {/* Codex Config */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-white">Codex 配置</span>
            </div>
            <CopyBlock text={codexConfig} label="复制" />
          </div>

          {/* Claude Code Config */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium text-white">Claude Code 配置</span>
            </div>
            <CopyBlock text={claudeConfig} label="复制" />
          </div>
        </div>
      </div>
    </div>
  );
}

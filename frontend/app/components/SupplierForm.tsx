"use client";

import { useState } from "react";
import { Supplier } from "@/lib/api";

interface Props {
  supplier: Supplier | null;
  onSave: (data: Partial<Supplier>) => void;
  onClose: () => void;
}

const inputCls = "w-full bg-[#0a0a12] border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm text-[#e4e4e7] placeholder:text-[#52525b] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all";
const labelCls = "block text-xs text-[#a1a1aa] mb-1.5 font-medium";
const textareaCls = inputCls + " font-mono text-[13px] leading-relaxed resize-y";

const DEFAULT_CODEX = `{
  "env": {
    "ANTHROPIC_BASE_URL": "{base_url}",
    "ANTHROPIC_AUTH_TOKEN": "{api_key}",
    "ANTHROPIC_MODEL": "{model}"
  }
}`;

const DEFAULT_CLAUDE = `{
  "env": {
    "ANTHROPIC_BASE_URL": "{base_url}",
    "ANTHROPIC_AUTH_TOKEN": "{api_key}",
    "ANTHROPIC_MODEL": "{model}",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "{model}",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "{model}",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "{model}"
  }
}`;

export default function SupplierForm({ supplier, onSave, onClose }: Props) {
  const [name, setName] = useState(supplier?.name || "");
  const [description, setDescription] = useState(supplier?.description || "");
  const [baseUrls, setBaseUrls] = useState(supplier?.base_urls.join("\n") || "");
  const [docsUrl, setDocsUrl] = useState(supplier?.docs_url || "");
  const [workbenchUrl, setWorkbenchUrl] = useState(supplier?.workbench_url || "");
  const [codexTemplate, setCodexTemplate] = useState(supplier?.codex_template || DEFAULT_CODEX);
  const [claudeTemplate, setClaudeTemplate] = useState(supplier?.claude_template || DEFAULT_CLAUDE);
  const [models, setModels] = useState(supplier?.available_models.join("\n") || "");
  const [defaultModel, setDefaultModel] = useState(supplier?.default_model || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      base_urls: baseUrls.split("\n").map((s) => s.trim()).filter(Boolean),
      docs_url: docsUrl,
      workbench_url: workbenchUrl,
      codex_template: codexTemplate,
      claude_template: claudeTemplate,
      available_models: models.split("\n").map((s) => s.trim()).filter(Boolean),
      default_model: defaultModel,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111118] border border-[#1e1e2a] rounded-2xl w-[90%] max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#111118]/95 backdrop-blur-sm border-b border-[#1e1e2a] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">
              {supplier ? "编辑供应商" : "新建供应商"}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717a] hover:text-white hover:bg-[#1e1e2a] transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name + Default Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>名称 *</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="例如: Xiaomi TokenPlan" />
            </div>
            <div>
              <label className={labelCls}>默认模型</label>
              <input className={inputCls} value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} placeholder="mimo-v2.5-pro" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>描述</label>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="供应商简介" />
          </div>

          {/* URLs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  文档官网
                </span>
              </label>
              <input className={inputCls} value={docsUrl} onChange={(e) => setDocsUrl(e.target.value)} placeholder="https://platform.xiaomimimo.com/docs/..." />
            </div>
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  官网工作台
                </span>
              </label>
              <input className={inputCls} value={workbenchUrl} onChange={(e) => setWorkbenchUrl(e.target.value)} placeholder="https://platform.xiaomimimo.com/workbench" />
            </div>
          </div>

          {/* Base URLs */}
          <div>
            <label className={labelCls}>Base URLs（每行一个）</label>
            <textarea
              className={textareaCls}
              value={baseUrls}
              onChange={(e) => setBaseUrls(e.target.value)}
              placeholder={"https://token-plan-cn.xiaomimimo.com/anthropic\nhttps://token-plan.xiaomimimo.com/anthropic"}
              rows={3}
            />
          </div>

          {/* Models */}
          <div>
            <label className={labelCls}>可用模型（每行一个）</label>
            <textarea
              className={textareaCls}
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder={"mimo-v2.5-pro\nclaude-sonnet-4-20250514\nclaude-opus-4-20250514"}
              rows={3}
            />
          </div>

          {/* Templates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Codex 配置模板</label>
              <textarea className={textareaCls} value={codexTemplate} onChange={(e) => setCodexTemplate(e.target.value)} rows={8} />
            </div>
            <div>
              <label className={labelCls}>Claude Code 配置模板</label>
              <textarea className={textareaCls} value={claudeTemplate} onChange={(e) => setClaudeTemplate(e.target.value)} rows={8} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#1e1e2a]">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#a1a1aa] border border-[#2a2a3a] hover:bg-[#1a1a2a] hover:text-white transition-all">
              取消
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">
              {supplier ? "保存修改" : "创建供应商"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

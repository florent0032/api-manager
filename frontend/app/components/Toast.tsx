"use client";

export default function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl bg-[#1e1e2e] border border-[#2a2a3a] text-sm text-[#e4e4e7] shadow-2xl animate-fade-in">
      {message}
    </div>
  );
}

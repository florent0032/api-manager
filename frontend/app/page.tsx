"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Supplier, ApiKey, HealthTestResponse } from "@/lib/api";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import SupplierDetail from "./components/SupplierDetail";
import HealthTestPanel from "./components/HealthTestPanel";
import SupplierForm from "./components/SupplierForm";
import Toast from "./components/Toast";

export type View = "dashboard" | "supplier" | "health-test";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await api.listSuppliers();
      setSuppliers(data);
    } catch (e: any) {
      showToast(`加载失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleSelectSupplier = (id: number) => {
    setSelectedSupplierId(id);
    setView("supplier");
  };

  const handleCreateSupplier = () => {
    setEditingSupplier(null);
    setShowSupplierForm(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
  };

  const handleSaveSupplier = async (data: Partial<Supplier>) => {
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, data);
        showToast("供应商已更新");
      } else {
        await api.createSupplier(data);
        showToast("供应商已创建");
      }
      setShowSupplierForm(false);
      loadSuppliers();
    } catch (e: any) {
      showToast(`保存失败: ${e.message}`);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("确定删除该供应商及其所有密钥？")) return;
    try {
      await api.deleteSupplier(id);
      showToast("供应商已删除");
      if (selectedSupplierId === id) {
        setSelectedSupplierId(null);
        setView("dashboard");
      }
      loadSuppliers();
    } catch (e: any) {
      showToast(`删除失败: ${e.message}`);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        suppliers={suppliers}
        selectedId={selectedSupplierId}
        view={view}
        onSelectSupplier={handleSelectSupplier}
        onSelectDashboard={() => setView("dashboard")}
        onSelectHealthTest={() => setView("health-test")}
        onCreateSupplier={handleCreateSupplier}
        onDeleteSupplier={handleDeleteSupplier}
        loading={loading}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {view === "dashboard" && (
          <Dashboard suppliers={suppliers} onSelectSupplier={handleSelectSupplier} />
        )}
        {view === "supplier" && selectedSupplier && (
          <SupplierDetail
            supplier={selectedSupplier}
            onEdit={() => handleEditSupplier(selectedSupplier)}
            onRefresh={loadSuppliers}
            showToast={showToast}
          />
        )}
        {view === "health-test" && (
          <HealthTestPanel suppliers={suppliers} showToast={showToast} />
        )}
      </main>
      {showSupplierForm && (
        <SupplierForm
          supplier={editingSupplier}
          onSave={handleSaveSupplier}
          onClose={() => setShowSupplierForm(false)}
        />
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}

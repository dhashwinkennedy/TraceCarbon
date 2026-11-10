import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { manufacturerService } from '../../services/manufacturer.service';
import { Product } from '../../types';
import { Package, Plus, Pencil, Power, Tag } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [scope3Category, setScope3Category] = useState<'Category 1' | 'Category 2'>('Category 1');
  const [relevantUnit, setRelevantUnit] = useState('tonnes');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status toggle modal
  const [statusTarget, setStatusTarget] = useState<Product | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await manufacturerService.getProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductName('');
    setProductCode('');
    setScope3Category('Category 1');
    setRelevantUnit('tonnes');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProductName(p.product_name);
    setProductCode(p.product_code);
    setScope3Category((p.scope3_category as any) || 'Category 1');
    setRelevantUnit(p.relevant_unit || 'tonnes');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await manufacturerService.updateProduct(editingProduct.id, {
          product_name: productName,
          product_code: productCode,
          scope3_category: scope3Category,
          relevant_unit: relevantUnit,
        });
      } else {
        await manufacturerService.createProduct({
          product_name: productName,
          product_code: productCode,
          scope3_category: scope3Category,
          relevant_unit: relevantUnit,
          active: true,
        });
      }
      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = statusTarget.active === false ? true : false;
      await manufacturerService.setProductStatus(statusTarget.id, newStatus);
      setStatusTarget(null);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to update product status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Catalog"
        subtitle="Catalog of purchased components, raw materials, and capital equipment items"
      >
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={fetchProducts} />}

      {isLoading ? (
        <LoadingSpinner text="Loading products..." />
      ) : products.length === 0 ? (
        <EmptyState
          title="No Products in Catalog"
          description="Add items purchased from your supply chain to associate emission factors"
          icon={<Package className="w-8 h-8 text-emerald-500" />}
          action={{
            label: 'Add First Product',
            onClick: openCreateModal,
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Product Name</th>
                <th className="px-6 py-3.5 font-semibold">Product Code</th>
                <th className="px-6 py-3.5 font-semibold">Scope 3 Category</th>
                <th className="px-6 py-3.5 font-semibold">Relevant Unit</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <span>{p.product_name}</span>
                        <span className="block text-[11px] font-mono text-slate-400 font-normal">
                          {p.id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">
                    {p.product_code}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.scope3_category} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{p.relevant_unit}</td>
                  <td className="px-6 py-4">
                    {p.active !== false ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Edit Product"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatusTarget(p)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.active !== false
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={p.active !== false ? 'Deactivate Product' : 'Activate Product'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aluminium Ingot 99.7%"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Product Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ALU-001"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Scope 3 Category
                  </label>
                  <select
                    value={scope3Category}
                    onChange={(e) => setScope3Category(e.target.value as any)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Category 1">Category 1 (Purchased Goods)</option>
                    <option value="Category 2">Category 2 (Capital Goods)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Relevant Unit
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. tonnes, unit, kg"
                    value={relevantUnit}
                    onChange={(e) => setRelevantUnit(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      <ConfirmationModal
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.active !== false ? 'Deactivate Product' : 'Activate Product'}
        message={`Are you sure you want to ${
          statusTarget?.active !== false ? 'deactivate' : 'activate'
        } product "${statusTarget?.product_name}" (${statusTarget?.product_code})?`}
        confirmText={statusTarget?.active !== false ? 'Deactivate' : 'Activate'}
        confirmVariant={statusTarget?.active !== false ? 'warning' : 'primary'}
        isLoading={isUpdatingStatus}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};

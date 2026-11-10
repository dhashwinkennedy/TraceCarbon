import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/supplier.service';
import { SavedSpreadsheetFormat } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorState } from '../common/ErrorState';
import { formatDate } from '../../utils/formatters';
import {
  FileSpreadsheet,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  Calendar,
  AlertCircle,
  Bookmark,
} from 'lucide-react';

interface SavedFormatsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SavedFormatsManagerModal: React.FC<SavedFormatsManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formats, setFormats] = useState<SavedSpreadsheetFormat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFormats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supplierService.getSavedFormats();
      setFormats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load saved spreadsheet formats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFormats();
      setEditingId(null);
      setDeletingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartRename = (fmt: SavedSpreadsheetFormat) => {
    setEditingId(fmt.id);
    setEditingName(fmt.name);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingName.trim()) return;
    setIsUpdating(true);
    try {
      await supplierService.updateSavedFormat(id, { name: editingName.trim() });
      setEditingId(null);
      await loadFormats();
    } catch (err: any) {
      alert(err.message || 'Failed to rename format');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await supplierService.deleteSavedFormat(id);
      setDeletingId(null);
      await loadFormats();
    } catch (err: any) {
      alert(err.message || 'Failed to delete format');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Saved Spreadsheet Formats
              </h3>
              <p className="text-xs text-slate-500">
                Manage your saved column mapping templates for automated report ingestion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && <ErrorState message={error} onRetry={loadFormats} />}

          {isLoading ? (
            <LoadingSpinner text="Loading saved formats..." />
          ) : formats.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No Saved Spreadsheet Formats Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When you upload a spreadsheet and map columns, check "Save this spreadsheet format" to reuse the mapping in future reporting periods.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {formats.map((fmt) => {
                const isEditing = editingId === fmt.id;
                const isConfirmingDelete = deletingId === fmt.id;
                const isExpanded = expandedId === fmt.id;
                const mappedKeys = Object.keys(fmt.mappings || {});

                return (
                  <div
                    key={fmt.id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-2.5 py-1 text-sm font-semibold border border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none w-full max-w-xs"
                              placeholder="Format Name"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRename(fmt.id)}
                              disabled={isUpdating || !editingName.trim()}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                              title="Save name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{fmt.name}</h4>
                            <button
                              onClick={() => handleStartRename(fmt)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                              title="Rename format"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1 font-medium">
                            <Layers className="w-3.5 h-3.5 text-emerald-600" />
                            {mappedKeys.length} activity {mappedKeys.length === 1 ? 'mapping' : 'mappings'}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                            {fmt.headers?.length || 0} recognized columns
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            Updated {formatDate(fmt.updated_at || fmt.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : fmt.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          {isExpanded ? 'Hide Details' : 'View Mappings'}
                        </button>
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(fmt.id)}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
                            >
                              {isDeleting ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(fmt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete saved format"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded details: column alignments */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-2 animate-fade-in">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Mapped Columns:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(fmt.mappings || {}).map(([actId, mapping]) => (
                            <div
                              key={actId}
                              className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                            >
                              <span className="font-mono font-bold text-slate-800">{actId}</span>
                              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {mapping.column} ({mapping.unit})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

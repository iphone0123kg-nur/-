import React, { useState } from 'react';
import { ShopSettings } from '../types';
import {
  Settings,
  Store,
  Phone,
  MapPin,
  User,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { exportAllDataBackup, clearAllData } from '../utils/storage';

interface SettingsModalProps {
  settings: ShopSettings;
  onSaveSettings: (settings: ShopSettings) => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetData,
  onClose,
}) => {
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleConfirmClear = () => {
    clearAllData();
    onResetData();
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="settings-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-auto border border-neutral-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base sm:text-lg">Дүкөн жана Касса жөндөөлөрү</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Shop Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-neutral-500" />
              Дүкөндүн аталышы:
            </label>
            <input
              type="text"
              required
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Дүкөндүн урааны / түрү:
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="Мис: Азык-түлүк жана үй тиричилик дүкөнү"
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                Дареги:
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                Телефон номери:
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-500" />
                Кассирдин аты:
              </label>
              <input
                type="text"
                value={formData.cashierName}
                onChange={(e) => setFormData({ ...formData, cashierName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                ИНН / Патент номери:
              </label>
              <input
                type="text"
                value={formData.taxNumber || ''}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Receipt Footer */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Чектеги ыраазычылык тексти:
            </label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Data Backup & Reset */}
          <div className="pt-4 border-t border-neutral-200 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Маалыматтарды сактоо жана тазалоо
            </h4>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={exportAllDataBackup}
                className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Резервдик көчүрмө (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Маалыматтарды толук тазалоо</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold border border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50"
            >
              Жокко чыгаруу
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Сакталды!</span>
                </>
              ) : (
                <span>Жөндөөлөрдү сактоо</span>
              )}
            </button>
          </div>
        </form>

        {/* Clear All Confirmation Modal */}
        {showClearConfirm && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm sm:text-base">
                    Базаны толук тазалоо
                  </h4>
                  <p className="text-xs text-neutral-500">Бардык маалыматтар өчүрүлөт</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Бардык товарлар, сатуулар, карыздар, кардарлар жана чыгымдар тазаланып, база толук бош абалга келет. Өзүңүз жаңыдан киргизе аласыз.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs transition"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ооба, толук тазала</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

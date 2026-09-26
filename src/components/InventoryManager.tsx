import React, { useState, useMemo } from 'react';
import { Product, UnitType, ShopSettings, StockAdjustment } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowDownToLine,
  Download,
  Filter,
  Check,
  X,
  TrendingUp,
  Boxes,
  DollarSign,
  Sliders,
  History,
  FileText,
  ClipboardList,
  Percent,
} from 'lucide-react';

interface InventoryManagerProps {
  products: Product[];
  categories: string[];
  settings: ShopSettings;
  adjustments: StockAdjustment[];
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onRestock: (
    productId: string,
    quantityToAdd: number,
    newCostPrice?: number,
    newSalePrice?: number
  ) => void;
  onManualAdjustStock: (productId: string, newStock: number, reason: string) => void;
  onAddCategory: (newCategory: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  categories,
  settings,
  adjustments,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRestock,
  onManualAdjustStock,
  onAddCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Бардыгы');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Restock modal state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('5');
  const [restockCost, setRestockCost] = useState('');
  const [restockMarkupPercent, setRestockMarkupPercent] = useState('25');
  const [restockSalePrice, setRestockSalePrice] = useState('');

  // Manual Inventory Adjustment modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState('');
  const [adjustReason, setAdjustReason] = useState('Инвентаризация / Эсептөө (Audit)');
  const [customReason, setCustomReason] = useState('');

  // Adjustment History log modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Category modal
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Form state for add/edit product
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    barcode: '',
    category: categories[1] || 'Ири тиричилик техникасы',
    costPrice: '',
    markupPercent: '25',
    salePrice: '',
    stock: '',
    minStock: '2',
    unit: 'даана' as UnitType,
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      barcode: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      category: categories[1] || 'Ири тиричилик техникасы',
      costPrice: '',
      markupPercent: '25',
      salePrice: '',
      stock: '5',
      minStock: '2',
      unit: 'даана',
    });
    setIsAddEditOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    const markup =
      p.markupPercent !== undefined
        ? p.markupPercent
        : p.costPrice > 0
        ? Number((((p.salePrice - p.costPrice) / p.costPrice) * 100).toFixed(1))
        : 25;
    setFormData({
      name: p.name,
      description: p.description || '',
      barcode: p.barcode,
      category: p.category,
      costPrice: p.costPrice.toString(),
      markupPercent: markup.toString(),
      salePrice: p.salePrice.toString(),
      stock: p.stock.toString(),
      minStock: p.minStock.toString(),
      unit: p.unit,
    });
    setIsAddEditOpen(true);
  };

  // Sync Wholesale Price -> Retail Price using Markup %
  const handleFormCostChange = (val: string) => {
    const cost = parseFloat(val);
    const markup = parseFloat(formData.markupPercent);
    let newSalePrice = formData.salePrice;
    if (!isNaN(cost) && cost > 0 && !isNaN(markup)) {
      newSalePrice = Math.round(cost * (1 + markup / 100)).toString();
    }
    setFormData((prev) => ({
      ...prev,
      costPrice: val,
      salePrice: newSalePrice,
    }));
  };

  // Sync Markup % -> Retail Price
  const handleFormMarkupChange = (val: string) => {
    const cost = parseFloat(formData.costPrice);
    const markup = parseFloat(val);
    let newSalePrice = formData.salePrice;
    if (!isNaN(cost) && cost > 0 && !isNaN(markup)) {
      newSalePrice = Math.round(cost * (1 + markup / 100)).toString();
    }
    setFormData((prev) => ({
      ...prev,
      markupPercent: val,
      salePrice: newSalePrice,
    }));
  };

  // Quick Preset Markup % (+10%, +15%, +20%, +25%, +30%, +40%, etc.)
  const handlePresetMarkup = (percent: number) => {
    const cost = parseFloat(formData.costPrice);
    let newSalePrice = formData.salePrice;
    if (!isNaN(cost) && cost > 0) {
      newSalePrice = Math.round(cost * (1 + percent / 100)).toString();
    }
    setFormData((prev) => ({
      ...prev,
      markupPercent: percent.toString(),
      salePrice: newSalePrice,
    }));
  };

  // Sync Retail Price -> Markup %
  const handleFormSalePriceChange = (val: string) => {
    const cost = parseFloat(formData.costPrice);
    const sale = parseFloat(val);
    let newMarkup = formData.markupPercent;
    if (!isNaN(cost) && cost > 0 && !isNaN(sale)) {
      newMarkup = Number((((sale - cost) / cost) * 100).toFixed(1)).toString();
    }
    setFormData((prev) => ({
      ...prev,
      salePrice: val,
      markupPercent: newMarkup,
    }));
  };

  const openAdjustModal = (p: Product) => {
    setAdjustProduct(p);
    setAdjustNewStock(p.stock.toString());
    setAdjustReason('Инвентаризация / Эсептөө (Audit)');
    setCustomReason('');
    setIsAdjustOpen(true);
  };

  const openRestockModal = (p: Product) => {
    setRestockProduct(p);
    setRestockQty('5');
    setRestockCost(p.costPrice.toString());
    const markup =
      p.markupPercent !== undefined
        ? p.markupPercent
        : p.costPrice > 0
        ? Number((((p.salePrice - p.costPrice) / p.costPrice) * 100).toFixed(1))
        : 25;
    setRestockMarkupPercent(markup.toString());
    setRestockSalePrice(p.salePrice.toString());
    setIsRestockOpen(true);
  };

  const handleRestockCostChange = (val: string) => {
    setRestockCost(val);
    const cost = parseFloat(val);
    const markup = parseFloat(restockMarkupPercent);
    if (!isNaN(cost) && cost > 0 && !isNaN(markup)) {
      setRestockSalePrice(Math.round(cost * (1 + markup / 100)).toString());
    }
  };

  const handleRestockMarkupChange = (val: string) => {
    setRestockMarkupPercent(val);
    const cost = parseFloat(restockCost);
    const markup = parseFloat(val);
    if (!isNaN(cost) && cost > 0 && !isNaN(markup)) {
      setRestockSalePrice(Math.round(cost * (1 + markup / 100)).toString());
    }
  };

  const handleRestockPresetMarkup = (percent: number) => {
    setRestockMarkupPercent(percent.toString());
    const cost = parseFloat(restockCost);
    if (!isNaN(cost) && cost > 0) {
      setRestockSalePrice(Math.round(cost * (1 + percent / 100)).toString());
    }
  };

  const handleRestockSalePriceChange = (val: string) => {
    setRestockSalePrice(val);
    const cost = parseFloat(restockCost);
    const sale = parseFloat(val);
    if (!isNaN(cost) && cost > 0 && !isNaN(sale)) {
      setRestockMarkupPercent(Number((((sale - cost) / cost) * 100).toFixed(1)).toString());
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const costPrice = parseFloat(formData.costPrice) || 0;
    const salePrice = parseFloat(formData.salePrice) || 0;
    const markupPercent =
      parseFloat(formData.markupPercent) ||
      (costPrice > 0 ? Number((((salePrice - costPrice) / costPrice) * 100).toFixed(1)) : 0);
    const stock = parseFloat(formData.stock) || 0;
    const minStock = parseFloat(formData.minStock) || 0;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: formData.name.trim(),
        description: formData.description.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category,
        costPrice,
        salePrice,
        markupPercent,
        stock,
        minStock,
        unit: formData.unit,
        updatedAt: Date.now(),
      });
    } else {
      onAddProduct({
        name: formData.name.trim(),
        description: formData.description.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category,
        costPrice,
        salePrice,
        markupPercent,
        stock,
        minStock,
        unit: formData.unit,
      });
    }

    setIsAddEditOpen(false);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    const qty = parseFloat(restockQty) || 0;
    if (qty <= 0) return;
    const cost = restockCost ? parseFloat(restockCost) : undefined;
    const sale = restockSalePrice ? parseFloat(restockSalePrice) : undefined;
    onRestock(restockProduct.id, qty, cost, sale);
    setIsRestockOpen(false);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    const newStock = parseFloat(adjustNewStock);
    if (isNaN(newStock) || newStock < 0) return;

    const finalReason =
      adjustReason === 'Башка' && customReason.trim()
        ? `Башка: ${customReason.trim()}`
        : adjustReason;

    onManualAdjustStock(adjustProduct.id, newStock, finalReason);
    setIsAdjustOpen(false);
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'Бардыгы' && p.category !== categoryFilter) {
        return false;
      }
      if (stockStatusFilter === 'out' && p.stock > 0) {
        return false;
      }
      if (stockStatusFilter === 'low' && (p.stock <= 0 || p.stock > p.minStock)) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [products, categoryFilter, stockStatusFilter, searchTerm]);

  // Inventory KPI metrics
  const totalStockRetailValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stock * p.salePrice, 0);
  }, [products]);

  const totalStockCostValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
  }, [products]);

  const expectedProfit = totalStockRetailValue - totalStockCostValue;

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= 0).length;
  }, [products]);

  // CSV export
  const exportToCSV = () => {
    const headers = [
      'Аталышы (Name)',
      'Сүрөттөмөсү (Description)',
      'Штрих-код (Barcode)',
      'Категория (Category)',
      'Өздүк нарк / Закупка (Cost)',
      'Сатуу баасы (Price)',
      'Калдык (Stock)',
      'Бирдиги (Unit)',
      'Жалпы сатуу наркы (Total Value)',
    ];
    const rows = products.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      `"${p.barcode}"`,
      `"${p.category}"`,
      p.costPrice,
      p.salePrice,
      p.stock,
      p.unit,
      p.stock * p.salePrice,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tovarlar_uchet_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="inventory-manager-view" className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100">
      {/* Top Header & Metrics */}
      <div className="p-4 sm:p-6 bg-white border-b border-neutral-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Boxes className="w-6 h-6 text-emerald-600" />
              <span>Товардык Учет жана Инвентаризация</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Товарлардын калдыктарын көзөмөлдөө, кол менен калдыктарды тактоо (инвентаризация), өздүк нарк жана баалар
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Инвентаризация жана кол менен түзөтүүлөрдүн тарыхы"
            >
              <History className="w-4 h-4 text-neutral-500" />
              <span>Түзөтүү тарыхы ({adjustments.length})</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Excel форматында жүктөп алуу"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              <span>Excel (CSV) экспорт</span>
            </button>
            <button
              id="add-product-btn"
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Жаңы товар кошуу</span>
            </button>
          </div>
        </div>

        {/* Inventory Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Жалпы товар түрү:</span>
              <Package className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-xl font-bold text-neutral-900">
              {products.length}{' '}
              <span className="text-xs font-normal text-neutral-500">позиция</span>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Склад сатуу баасы:</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-neutral-900">
              {totalStockRetailValue.toLocaleString()}{' '}
              <span className="text-xs font-normal text-neutral-500">{settings.currency}</span>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Күтүлгөн пайда (Маржа):</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700">
              +{expectedProfit.toLocaleString()}{' '}
              <span className="text-xs font-normal text-neutral-500">{settings.currency}</span>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Эскертүүлөр:</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                Аз калган: {lowStockCount}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  outOfStockCount > 0 ? 'bg-red-100 text-red-800' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                Түгөнгөн: {outOfStockCount}
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Аталышы, сүрөттөмөсү же штрих-код боюнча издөө..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Категория: {c}
                </option>
              ))}
            </select>

            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">Калдык: Бардыгы</option>
              <option value="low">Калдыгы аз (эскертүү чеги)</option>
              <option value="out">Түгөнгөндөр (0 даана)</option>
            </select>

            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Жаңы категория</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Товар & Сүрөттөмөсү</th>
                <th className="py-3 px-3">Штрих-код</th>
                <th className="py-3 px-3">Категория</th>
                <th className="py-3 px-3 text-right">Оптом баасы (Закупка)</th>
                <th className="py-3 px-3 text-center">Үстөк % (Наценка)</th>
                <th className="py-3 px-3 text-right">Розница баасы</th>
                <th className="py-3 px-3 text-right">Пайда (Үстөк)</th>
                <th className="py-3 px-3 text-center">Калдык (Склад)</th>
                <th className="py-3 px-3 text-right">Жалпы наркы</th>
                <th className="py-3 px-4 text-center">Аракеттер</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-400">
                    Товарлар табылган жок
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const margin = p.salePrice - p.costPrice;
                  const marginPercent =
                    p.markupPercent !== undefined
                      ? p.markupPercent
                      : p.costPrice > 0
                      ? Number((((p.salePrice - p.costPrice) / p.costPrice) * 100).toFixed(1))
                      : 100;
                  const isLow = p.stock > 0 && p.stock <= p.minStock;
                  const isOut = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-500">
                        {p.barcode || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-neutral-600">
                        {p.costPrice.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          +{marginPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-neutral-900">
                        {p.salePrice.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-emerald-700 font-semibold">
                          +{margin.toLocaleString()} {settings.currency}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            isOut
                              ? 'bg-red-100 text-red-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-neutral-800">
                        {(p.stock * p.salePrice).toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Manual Stock Adjust button */}
                          <button
                            onClick={() => openAdjustModal(p)}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            title="Калдыкты кол менен оңдоо (Инвентаризация)"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          {/* Restock (Приход) button */}
                          <button
                            onClick={() => openRestockModal(p)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Складга кабыл алуу (Приход / Restock)"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                          {/* Edit details */}
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Товарды оңдоо"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Өчүрүү"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200 my-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                {editingProduct ? 'Товарды өзгөртүү' : 'Жаңы товар кошуу'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Товардын аталышы (Name) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Мисалы: Товардын аталышы же модели"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Сүрөттөмөсү (Description):
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Мисалы: Инвертор компрессор, 10 жыл кепилдик, кубаттуулугу 2000W, өлкөсү..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Штрих-код (Barcode)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="47000..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Категориясы
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                  >
                    {categories
                      .filter((c) => c !== 'Бардыгы')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Pricing section with Wholesale, Markup %, and Retail Price */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    <span>Баа коюу жана Үстөк % (Ценообразование & Наценка)</span>
                  </span>
                  {(parseFloat(formData.salePrice) || 0) > (parseFloat(formData.costPrice) || 0) && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Үстөк пайда: +{(
                        (parseFloat(formData.salePrice) || 0) -
                        (parseFloat(formData.costPrice) || 0)
                      ).toLocaleString()}{' '}
                      {settings.currency} (+{formData.markupPercent}%)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      1. Оптом баасы (Закупка) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.costPrice}
                      onChange={(e) => handleFormCostChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      2. Үстөк % (Наценка) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.markupPercent}
                        onChange={(e) => handleFormMarkupChange(e.target.value)}
                        placeholder="25"
                        className="w-full pl-3 pr-7 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold text-blue-700"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-neutral-400">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      3. Розница сатуу баасы *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.salePrice}
                      onChange={(e) => handleFormSalePriceChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-400 bg-emerald-50/60 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-black text-emerald-900"
                    />
                  </div>
                </div>

                {/* Quick preset markup buttons */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-neutral-500 font-medium">
                      Тез үстөк пайызын тандоо:
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      (Оптом баасына автоматтык кошот)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 15, 20, 25, 30, 35, 40, 50, 60].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handlePresetMarkup(pct)}
                        className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
                          Math.round(parseFloat(formData.markupPercent) || 0) === pct
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Баштапкы калдык (Initial Stock) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Бирдиги (Unit)
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value as UnitType })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                  >
                    <option value="даана">даана</option>
                    <option value="кг">кг</option>
                    <option value="литр">литр</option>
                    <option value="пачка">пачка</option>
                    <option value="метр">метр</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Эскертүү чеги
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  {editingProduct ? 'Сактоо' : 'Кошуу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment (Инвентаризация) Modal */}
      {isAdjustOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 my-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-600" />
                <span>Калдыкты кол менен тактоо</span>
              </h4>
              <button
                onClick={() => setIsAdjustOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 font-semibold text-emerald-800 mb-4">
              {adjustProduct.name}
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Системадагы калдык:</span>
                  <span className="font-bold text-neutral-800">
                    {adjustProduct.stock} {adjustProduct.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Бирдик наркы:</span>
                  <span className="font-semibold text-neutral-700">
                    {adjustProduct.salePrice} {settings.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Факт боюнча жаңы калдык ({adjustProduct.unit}) *:
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(e.target.value)}
                  className="w-full px-3 py-2 text-base font-black rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              {/* Difference feedback */}
              {adjustNewStock !== '' && !isNaN(parseFloat(adjustNewStock)) && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs flex justify-between items-center">
                  <span className="text-amber-800 font-medium">Айырмасы (Разница):</span>
                  <span
                    className={`font-black text-sm ${
                      parseFloat(adjustNewStock) - adjustProduct.stock >= 0
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {parseFloat(adjustNewStock) - adjustProduct.stock >= 0 ? '+' : ''}
                    {(parseFloat(adjustNewStock) - adjustProduct.stock).toFixed(1)}{' '}
                    {adjustProduct.unit}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Түзөтүүнүн себеби (Reason) *:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                >
                  <option value="Инвентаризация / Эсептөө (Audit)">
                    Инвентаризация / Эсептөө (Physical Audit)
                  </option>
                  <option value="Бузулуу / Жараксыз (Damage / Spoilage)">
                    Бузулуу / Жараксыз (Damage / Spoilage)
                  </option>
                  <option value="Жоготуу же уурдалуу (Loss / Shrinkage)">
                    Жоготуу же уурдалуу (Loss / Shrinkage)
                  </option>
                  <option value="Ашыкча табылды (Surplus found)">
                    Ашыкча табылды (Surplus found)
                  </option>
                  <option value="Кайтарым же кассалык оңдоо">
                    Кайтарым же кассалык оңдоо
                  </option>
                  <option value="Башка">Башка себеп (Кол менен жазуу)</option>
                </select>
              </div>

              {adjustReason === 'Башка' && (
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Себебин так жазыңыз..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Калдыкты бекитүү
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock (Приход) Modal */}
      {isRestockOpen && restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 my-6">
            <h4 className="text-base font-bold text-neutral-900 mb-1">
              Товар кабыл алуу (Приход / Restock)
            </h4>
            <p className="text-xs text-neutral-600 mb-4 font-semibold text-emerald-700">
              {restockProduct.name}
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Складга кошулуучу сан ({restockProduct.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              {/* Price & Markup adjustment for this batch */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                <div className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                  <span>Бааларды жаңылоо (Оптом & Үстөк %)</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Өзгөртүү милдеттүү эмес</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      Оптом баасы:
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={restockCost}
                      onChange={(e) => handleRestockCostChange(e.target.value)}
                      placeholder={restockProduct.costPrice.toString()}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      Үстөк %:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={restockMarkupPercent}
                        onChange={(e) => handleRestockMarkupChange(e.target.value)}
                        placeholder="25"
                        className="w-full pl-2 pr-5 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-blue-700"
                      />
                      <span className="absolute right-1.5 top-1.5 text-[10px] font-bold text-neutral-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      Розница сатуу:
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={restockSalePrice}
                      onChange={(e) => handleRestockSalePriceChange(e.target.value)}
                      placeholder={restockProduct.salePrice.toString()}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-400 bg-emerald-50/60 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-emerald-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-neutral-500">Үстөк:</span>
                  {[15, 20, 25, 30, 40].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleRestockPresetMarkup(pct)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                        Math.round(parseFloat(restockMarkupPercent) || 0) === pct
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600 space-y-1.5">
                <div className="flex justify-between">
                  <span>Учурдагы калдык:</span>
                  <span className="font-bold text-neutral-800">
                    {restockProduct.stock} {restockProduct.unit}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Приходдон кийин жалпы калдык:</span>
                  <span className="font-bold">
                    {restockProduct.stock + (parseFloat(restockQty) || 0)} {restockProduct.unit}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-700 pt-1 border-t border-neutral-200/60">
                  <span>Приход наркы (Оптом суммасы):</span>
                  <span className="font-bold">
                    {(
                      (parseFloat(restockQty) || 0) *
                      (parseFloat(restockCost) || restockProduct.costPrice)
                    ).toLocaleString()}{' '}
                    {settings.currency}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Приходду кабыл алуу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjustments History Log Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-neutral-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                <h4 className="text-base font-bold text-neutral-900">
                  Инвентаризация жана Түзөтүүлөрдүн тарыхы
                </h4>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {adjustments.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  Азырынча кол менен оңдолгон инвентаризация жазуулары жок.
                </div>
              ) : (
                <div className="space-y-2">
                  {adjustments.map((adj) => (
                    <div
                      key={adj.id}
                      className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/70 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-neutral-900">{adj.productName}</span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(adj.timestamp).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>
                          Мурунку калдык: <b>{adj.previousStock}</b> → Жаңы калдык:{' '}
                          <b>{adj.newStock}</b>
                        </span>
                        <span
                          className={`font-black px-2 py-0.5 rounded ${
                            adj.difference >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {adj.difference >= 0 ? '+' : ''}
                          {adj.difference}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 pt-0.5">
                        Себеби: <span className="text-neutral-800">{adj.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800"
              >
                Жабуу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl border border-neutral-200">
            <h4 className="text-base font-bold text-neutral-900 mb-3">Жаңы категория кошуу</h4>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Категориянын аталышы..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 mb-4 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700"
              >
                Жокко чыгаруу
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newCatName.trim()) {
                    onAddCategory(newCatName.trim());
                    setNewCatName('');
                    setIsAddCategoryOpen(false);
                  }
                }}
                className="flex-1 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg"
              >
                Кошуу
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setProductToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 text-base">Товарды өчүрүү</h4>
                <p className="text-xs text-neutral-500">Бул аракетти артка кайтарууга болбойт</p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed">
              Чын эле <b>«{productToDelete.name}»</b> товарын склад тизмесинен өчүрүүнү каалайсызбы?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs transition"
              >
                Жок, калтыруу
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ооба, өчүрүү</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Customer, Sale, Debtor } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  ShoppingBag,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  X,
  Receipt,
  Edit2,
  Trash2,
  ExternalLink,
  Clock,
  ChevronRight,
  Package,
  Layers,
  ArrowUpRight,
  UserCheck,
  ArrowLeft,
  Zap,
  Sparkles,
  Flame,
  Star,
  Award,
  Crown,
  Banknote,
} from 'lucide-react';

interface CustomersDirectoryProps {
  customers: Customer[];
  sales: Sale[];
  debtors: Debtor[];
  currency: string;
  onUpdateCustomers: (customers: Customer[]) => void;
  onViewSaleReceipt: (sale: Sale) => void;
  onOpenDebtsTab?: () => void;
}

export const CustomersDirectory: React.FC<CustomersDirectoryProps> = ({
  customers,
  sales,
  debtors,
  currency,
  onUpdateCustomers,
  onViewSaleReceipt,
  onOpenDebtsTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'early_payers' | 'active_buyers' | 'top_best' | 'with_debt' | 'repeat' | 'with_phone'
  >('all');
  const [sortBy, setSortBy] = useState<
    'best_rating' | 'recent' | 'spent' | 'debt' | 'name'
  >('best_rating');

  // Selected customer for detailed view
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modal for adding / editing customer
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Tab inside customer detail view: 'sales' vs 'items' vs 'debts'
  const [detailTab, setDetailTab] = useState<'sales' | 'items' | 'debts'>('sales');

  // Helper to normalize strings for comparison
  const normalize = (str?: string) => (str || '').trim().toLowerCase();

  // Helper to clean phone for WhatsApp link
  const cleanPhoneForWhatsApp = (rawPhone?: string) => {
    if (!rawPhone) return '';
    return rawPhone.replace(/[^\d]/g, '');
  };

  // Build unified customer records enriched with their sales and debt
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const cNameNorm = normalize(c.name);
      const cPhoneNorm = normalize(c.phone);

      // Find all sales belonging to this customer
      const matchingSales = sales.filter((s) => {
        const sNameNorm = normalize(s.customerName);
        const sPhoneNorm = normalize(s.customerPhone);

        if (cNameNorm && sNameNorm && cNameNorm === sNameNorm) return true;
        if (cPhoneNorm && sPhoneNorm && cPhoneNorm === sPhoneNorm) return true;
        return false;
      });

      // Sort sales by timestamp descending
      matchingSales.sort((a, b) => b.timestamp - a.timestamp);

      // Find debtor record if any
      const matchingDebtor = debtors.find((d) => {
        const dNameNorm = normalize(d.name);
        const dPhoneNorm = normalize(d.phone);
        if (cNameNorm && dNameNorm && cNameNorm === dNameNorm) return true;
        if (cPhoneNorm && dPhoneNorm && cPhoneNorm === dPhoneNorm) return true;
        return false;
      });

      const totalSpent = matchingSales.reduce((sum, s) => {
        return sum + (s.status === 'completed' ? s.total : 0);
      }, 0);

      const totalUnitsBought = matchingSales.reduce((sum, s) => {
        return sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0);
      }, 0);

      const lastPurchaseTime = matchingSales.length > 0 ? matchingSales[0].timestamp : c.createdAt;
      const outstandingDebt = matchingDebtor?.balance || 0;
      const dueDate = matchingDebtor?.dueDate || matchingSales.find((s) => s.debtDueDate)?.debtDueDate;

      // Early debt payer evaluation
      let earlyPaymentsCount = 0;
      let totalDebtPaymentsCount = 0;
      if (matchingDebtor && matchingDebtor.payments.length > 0) {
        totalDebtPaymentsCount = matchingDebtor.payments.length;
        matchingDebtor.payments.forEach((p) => {
          if (p.paidEarly) {
            earlyPaymentsCount++;
          } else {
            const dueStr = p.dueDateAtPayment || matchingDebtor.dueDate;
            if (dueStr) {
              const dueTime = new Date(`${dueStr}T23:59:59`).getTime();
              if (p.timestamp < dueTime) {
                earlyPaymentsCount++;
              }
            }
          }
        });
      }

      // Is Early Payer: paid debts before the due date
      const isEarlyPayer = earlyPaymentsCount > 0;

      // Is Active Customer: purchases frequently or large quantity
      const isActiveCustomer = matchingSales.length >= 2 || totalUnitsBought >= 3 || totalSpent >= 20000;

      // Top Best Customer: both active AND pays debts early (or high volume payer)
      const isTopBest = (isEarlyPayer && isActiveCustomer) || (isEarlyPayer && matchingSales.length >= 1);

      // Customer Score for sorting
      let customerScore = 0;
      if (isTopBest) customerScore += 50;
      if (isEarlyPayer) customerScore += 30;
      if (isActiveCustomer) customerScore += 20;
      customerScore += matchingSales.length * 5;
      customerScore += Math.min(20, Math.floor(totalSpent / 10000));

      // Aggregated items bought
      const itemsSummaryMap = new Map<
        string,
        { name: string; quantity: number; unit: string; totalSpent: number; lastBoughtTime: number }
      >();

      matchingSales.forEach((s) => {
        s.items.forEach((it) => {
          const key = it.name.trim().toLowerCase();
          const existing = itemsSummaryMap.get(key);
          if (existing) {
            existing.quantity += it.quantity;
            existing.totalSpent += it.total;
            existing.lastBoughtTime = Math.max(existing.lastBoughtTime, s.timestamp);
          } else {
            itemsSummaryMap.set(key, {
              name: it.name,
              quantity: it.quantity,
              unit: it.unit || 'даана',
              totalSpent: it.total,
              lastBoughtTime: s.timestamp,
            });
          }
        });
      });

      const aggregatedItems = Array.from(itemsSummaryMap.values()).sort(
        (a, b) => b.totalSpent - a.totalSpent
      );

      return {
        ...c,
        matchingSales,
        matchingDebtor,
        totalSpent,
        totalUnitsBought,
        lastPurchaseTime,
        outstandingDebt,
        dueDate,
        aggregatedItems,
        isEarlyPayer,
        isActiveCustomer,
        isTopBest,
        earlyPaymentsCount,
        totalDebtPaymentsCount,
        customerScore,
      };
    });
  }, [customers, sales, debtors]);

  // Overall Statistics
  const totalCustomersCount = enrichedCustomers.length;
  const customersWithDebt = enrichedCustomers.filter((c) => c.outstandingDebt > 0);
  const totalDebtSum = customersWithDebt.reduce((sum, c) => sum + c.outstandingDebt, 0);
  const repeatCustomersCount = enrichedCustomers.filter((c) => c.matchingSales.length > 1).length;
  const customersWithPhoneCount = enrichedCustomers.filter((c) => Boolean(c.phone)).length;
  const earlyPayersCount = enrichedCustomers.filter((c) => c.isEarlyPayer).length;
  const activeCustomersCount = enrichedCustomers.filter((c) => c.isActiveCustomer).length;
  const topBestCount = enrichedCustomers.filter((c) => c.isTopBest).length;

  // Filter and Sort Customers
  const filteredCustomers = useMemo(() => {
    let list = [...enrichedCustomers];

    // Filter by search
    if (searchTerm.trim()) {
      const q = normalize(searchTerm);
      list = list.filter((c) => {
        const inName = normalize(c.name).includes(q);
        const inPhone = normalize(c.phone).includes(q);
        const inNotes = normalize(c.notes).includes(q);
        const inItems = c.aggregatedItems.some((it) => normalize(it.name).includes(q));
        return inName || inPhone || inNotes || inItems;
      });
    }

    // Filter by type
    if (filterType === 'early_payers') {
      list = list.filter((c) => c.isEarlyPayer);
    } else if (filterType === 'active_buyers') {
      list = list.filter((c) => c.isActiveCustomer);
    } else if (filterType === 'top_best') {
      list = list.filter((c) => c.isTopBest);
    } else if (filterType === 'with_debt') {
      list = list.filter((c) => c.outstandingDebt > 0);
    } else if (filterType === 'repeat') {
      list = list.filter((c) => c.matchingSales.length > 1);
    } else if (filterType === 'with_phone') {
      list = list.filter((c) => Boolean(c.phone));
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'best_rating') {
        return b.customerScore - a.customerScore;
      }
      if (sortBy === 'recent') {
        return b.lastPurchaseTime - a.lastPurchaseTime;
      }
      if (sortBy === 'spent') {
        return b.totalSpent - a.totalSpent;
      }
      if (sortBy === 'debt') {
        return b.outstandingDebt - a.outstandingDebt;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [enrichedCustomers, searchTerm, filterType, sortBy]);

  // Current selected customer object
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return enrichedCustomers.find((c) => c.id === selectedCustomerId) || null;
  }, [enrichedCustomers, selectedCustomerId]);

  // Handlers for Add/Edit Customer
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormNotes('');
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone || '');
    setFormNotes(c.notes || '');
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Кардардын аты-жөнүн жазыңыз');
      return;
    }

    if (editingCustomer) {
      // Edit existing
      const updated = customers.map((c) =>
        c.id === editingCustomer.id
          ? {
              ...c,
              name: formName.trim(),
              phone: formPhone.trim(),
              notes: formNotes.trim(),
              updatedAt: Date.now(),
            }
          : c
      );
      onUpdateCustomers(updated);
    } else {
      // Add new
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: formName.trim(),
        phone: formPhone.trim(),
        notes: formNotes.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onUpdateCustomers([newCust, ...customers]);
    }

    setIsEditModalOpen(false);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    const target = enrichedCustomers.find((c) => c.id === id);
    if (target && target.outstandingDebt > 0) {
      alert(`Бул кардардын (${name}) карызы бар (${target.outstandingDebt.toLocaleString()} ${currency}). Карыз жабылмайынча өчүрүлбөйт.`);
      return;
    }

    if (confirm(`Чын эле "${name}" кардардын маалыматын өчүрүүнү каалайсызбы?`)) {
      onUpdateCustomers(customers.filter((c) => c.id !== id));
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null);
      }
    }
  };

  return (
    <div id="customers-view" className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-neutral-900">
                Кардарлар базасы жана соода тарыхы
              </h1>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Сатуу учурунда кошулган кардарлар автоматтык сакталып, алынган товарларынын тарыхы толук жазылат
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="add-new-customer-btn"
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Жаңы кардар кошуу</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500 block">Жалпы кардарлар:</span>
              <span className="text-lg sm:text-xl font-black text-neutral-900">
                {totalCustomersCount}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500 block">Туруктуу кардарлар (2+):</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700">
                {repeatCustomersCount}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500 block">Ватсап байланышы бар:</span>
              <span className="text-lg sm:text-xl font-black text-neutral-900">
                {customersWithPhoneCount}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                Карызы барлар ({customersWithDebt.length}):
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-900">
                {totalDebtSum.toLocaleString()} {currency}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Customer List + Detail Drawer */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-4 gap-4">
        {/* Left Column: Customer Directory List */}
        <div
          className={`flex-1 flex-col bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden ${
            selectedCustomerId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search and Filters Bar */}
          <div className="p-3.5 border-b border-neutral-200 space-y-2.5 bg-neutral-50/60">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  id="search-customer-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Кардардын аты, Ватсап номери же алган товары боюнча издөө..."
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-neutral-500 font-medium">Тартиби:</span>
                <select
                  aria-label="Кардарларды иреттөө"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs py-2 px-2.5 bg-white border border-neutral-300 rounded-xl font-medium text-neutral-700 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="best_rating">⭐ Рейтинг / Мыкты кардарлар</option>
                  <option value="recent">Соңку соода боюнча</option>
                  <option value="spent">Соода суммасы боюнча</option>
                  <option value="debt">Карыз суммасы боюнча</option>
                  <option value="name">Аты-жөнү боюнча (А-Я)</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                  filterType === 'all'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Бардыгы ({enrichedCustomers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('early_payers')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === 'early_payers'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <span>⭐ Эрте төлөгөндөр ({earlyPayersCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('active_buyers')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === 'active_buyers'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>🔥 Активдүүлөр ({activeCustomersCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('top_best')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === 'top_best'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-white border border-purple-300 text-purple-800 hover:bg-purple-50'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-purple-500" />
                <span>👑 VIP Мыктылар ({topBestCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('with_debt')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === 'with_debt'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white border border-neutral-300 text-amber-700 hover:bg-amber-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Карызы барлар ({customersWithDebt.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('repeat')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === 'repeat'
                    ? 'bg-neutral-800 text-white shadow-2xs'
                    : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Туруктуу (2+) ({repeatCustomersCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('with_phone')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === 'with_phone'
                    ? 'bg-neutral-800 text-white shadow-2xs'
                    : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Телефон номери барлар ({customersWithPhoneCount})</span>
              </button>
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-600">Эч кандай кардар табылган жок</p>
                <p className="text-xs text-neutral-400">
                  Жаңы сатуу жүргүзүлгөндө же "Жаңы кардар кошуу" баскычы менен кошсоңуз болот
                </p>
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                const cleanPhone = cleanPhoneForWhatsApp(c.phone);

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-4 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    {/* Left: Avatar & Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase ${
                          c.outstandingDebt > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {c.name.slice(0, 2)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-neutral-900 truncate">
                            {c.name}
                          </h3>

                          {/* Customer Badges */}
                          {c.isTopBest ? (
                            <span
                              title="Активдүү товар алат жана карызын күнүнө жеткирбей эрте төлөйт!"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-400 shadow-2xs"
                            >
                              <Crown className="w-3 h-3 text-amber-800" />
                              <span>👑 Мыкты кардар</span>
                            </span>
                          ) : (
                            <>
                              {c.isEarlyPayer && (
                                <span
                                  title="Карызды күнүнө жеткирбей, мөөнөтүнөн эрте жабат!"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                >
                                  <Zap className="w-3 h-3 text-emerald-600" />
                                  <span>⭐ Карызды эрте төлөйт</span>
                                </span>
                              )}
                              {c.isActiveCustomer && (
                                <span
                                  title="Дүкөндөн туруктуу жана активдүү товар алып турат"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                  <Flame className="w-3 h-3 text-amber-600" />
                                  <span>🔥 Активдүү</span>
                                </span>
                              )}
                            </>
                          )}

                          {c.outstandingDebt > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-900 border border-red-200">
                              Карызы: {c.outstandingDebt.toLocaleString()} {currency}
                            </span>
                          )}
                          {c.matchingSales.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                              {c.matchingSales.length} соода
                            </span>
                          )}
                        </div>

                        {/* Phone / WhatsApp */}
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 flex-wrap">
                          {c.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-neutral-400" />
                              <span className="font-mono text-neutral-700">{c.phone}</span>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition ml-1"
                                  title="Ватсапка жазуу"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">Телефон номери жок</span>
                          )}

                          {c.dueDate && c.outstandingDebt > 0 && (
                            <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              Мөөнөтү: {c.dueDate}
                            </span>
                          )}
                        </div>

                        {/* Notes preview */}
                        {c.notes && (
                          <p className="text-[11px] text-neutral-400 truncate mt-1">
                            Эскертүү: {c.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Spend metrics & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-neutral-400 font-medium block">Жалпы соодасы:</span>
                        <span className="text-sm font-black text-neutral-900">
                          {c.totalSpent.toLocaleString()} {currency}
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          {c.matchingSales.length} чек / {c.totalUnitsBought} даана
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(c);
                          }}
                          className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 transition"
                          title="Оңдоо"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomer(c.id, c.name);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-neutral-400 hover:text-red-600 transition"
                          title="Өчүрүү"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="p-1.5 rounded-lg bg-neutral-100 hover:bg-emerald-600 hover:text-white text-neutral-700 transition"
                          title="Тарыхын көрүү"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Customer Details & Purchase History Panel */}
        <div
          id="customer-details-panel"
          className={`lg:w-1/2 flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden ${
            selectedCustomerId ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {activeCustomer ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Detail Header */}
              <div className="p-4 sm:p-5 bg-neutral-900 text-white shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(null)}
                      className="lg:hidden p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition shrink-0"
                      title="Тизмеге кайтуу"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 text-white font-black text-sm sm:text-base flex items-center justify-center uppercase shrink-0">
                      {activeCustomer.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold">
                          {activeCustomer.name}
                        </h2>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(activeCustomer)}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                          title="Маалыматты оңдоо"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {activeCustomer.isTopBest ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-400 text-neutral-950 font-black text-[11px] flex items-center gap-1 shadow-2xs">
                            <Crown className="w-3 h-3 text-neutral-950" />
                            <span>👑 VIP Мыкты кардар</span>
                          </span>
                        ) : (
                          <>
                            {activeCustomer.isEarlyPayer && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                                <Zap className="w-3 h-3" />
                                <span>⭐ Карызды эрте жабат</span>
                              </span>
                            )}
                            {activeCustomer.isActiveCustomer && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                                <Flame className="w-3 h-3" />
                                <span>🔥 Активдүү кардар</span>
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {activeCustomer.phone ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-neutral-300 font-mono">
                            {activeCustomer.phone}
                          </span>
                          <a
                            href={`https://wa.me/${cleanPhoneForWhatsApp(activeCustomer.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold transition shadow-2xs"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>Ватсап</span>
                          </a>
                          <a
                            href={`tel:${activeCustomer.phone}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-[11px] font-medium transition"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Чалуу</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400 mt-1">Ватсап / телефон номери жок</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                    title="Жабуу"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Outstanding Debt Alert Box if exists */}
                {activeCustomer.outstandingDebt > 0 && (
                  <div className="mt-4 p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-amber-200 block">
                          Учурдагы төлөнө элек карызы:
                        </span>
                        <span className="text-base font-black text-amber-100">
                          {activeCustomer.outstandingDebt.toLocaleString()} {currency}
                        </span>
                      </div>
                    </div>
                    {activeCustomer.dueDate && (
                      <div className="text-right">
                        <span className="text-[10px] text-amber-200 block">Берүү мөөнөтү:</span>
                        <span className="text-xs font-bold text-amber-100 bg-amber-600/60 px-2 py-0.5 rounded">
                          {activeCustomer.dueDate}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-neutral-800 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Жалпы соода:</span>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {activeCustomer.totalSpent.toLocaleString()} {currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Чектердин саны:</span>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {activeCustomer.matchingSales.length} чек
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Бардык товарлар:</span>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {activeCustomer.totalUnitsBought} даана
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-tabs: Чектер боюнча vs Алынган товарлар */}
              <div className="flex border-b border-neutral-200 bg-neutral-50 px-4 pt-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDetailTab('sales')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    detailTab === 'sales'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Чектер жана сатуулар ({activeCustomer.matchingSales.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('items')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    detailTab === 'items'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Алынган товарлар ({activeCustomer.aggregatedItems.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('debts')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    detailTab === 'debts'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>
                    Карыздар & Төлөмдөр ({activeCustomer.matchingDebtor?.payments.length || 0})
                  </span>
                  {activeCustomer.isEarlyPayer && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                      ⚡ Эрте
                    </span>
                  )}
                </button>
              </div>

              {/* Tab 1: Chronological Sales & Receipts */}
              {detailTab === 'sales' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeCustomer.matchingSales.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400">
                      <ShoppingBag className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                      <p className="text-xs font-medium">Бул кардардын азырынча сатуу чектери жок</p>
                    </div>
                  ) : (
                    activeCustomer.matchingSales.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5 hover:border-neutral-300 transition"
                      >
                        {/* Sale meta header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-neutral-900">
                              {s.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.paymentMethod === 'debt'
                                  ? 'bg-amber-100 text-amber-900'
                                  : s.paymentMethod === 'partial_debt'
                                  ? 'bg-orange-100 text-orange-900'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {s.paymentMethod === 'cash'
                                ? 'Накталай'
                                : s.paymentMethod === 'card'
                                ? 'Банк картасы'
                                : s.paymentMethod === 'qr'
                                ? 'MBank / QR'
                                : s.paymentMethod === 'partial_debt'
                                ? 'Жарым төлөм + Карыз'
                                : 'Карызга'}
                            </span>
                          </div>

                          <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            <span>{new Date(s.timestamp).toLocaleString('ru-RU')}</span>
                          </span>
                        </div>

                        {/* Partial / Debt breakdown if applicable */}
                        {(s.paymentMethod === 'debt' || s.paymentMethod === 'partial_debt') && (
                          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1">
                            {(s.paidNowAmount || 0) > 0 && (
                              <div className="flex justify-between text-emerald-800">
                                <span>Аванс (төлөнгөнү):</span>
                                <span className="font-bold">
                                  {(s.paidNowAmount || 0).toLocaleString()} {currency}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-amber-900 font-bold">
                              <span>Карызга жазылган сумма:</span>
                              <span>
                                {(s.debtAmount !== undefined
                                  ? s.debtAmount
                                  : s.total - (s.paidNowAmount || 0)
                                ).toLocaleString()}{' '}
                                {currency}
                              </span>
                            </div>
                            {s.debtDueDate && (
                              <div className="flex justify-between text-red-700 font-semibold text-[11px] pt-0.5 border-t border-amber-200/60">
                                <span>Кайтаруу мөөнөтү:</span>
                                <span>{s.debtDueDate}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Items inside this sale */}
                        <div className="space-y-1 pt-1 border-t border-neutral-200">
                          <span className="text-[11px] font-bold text-neutral-600 block">
                            Сатып алынган товарлар:
                          </span>
                          <div className="space-y-1">
                            {s.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-md border border-neutral-200/80"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-medium text-neutral-800 block truncate">
                                    {it.name}
                                  </span>
                                  <span className="text-[10px] text-neutral-500">
                                    {it.quantity} {it.unit} × {it.salePrice.toLocaleString()} {currency}
                                    {it.discountAmount && it.discountAmount > 0 ? (
                                      <span className="text-red-600 font-semibold ml-1">
                                        (-{it.discountAmount} {currency})
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                                <span className="font-bold text-neutral-900 shrink-0">
                                  {it.total.toLocaleString()} {currency}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Total and Action */}
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                          <div>
                            <span className="text-xs text-neutral-500">Чек боюнча жалпы: </span>
                            <span className="text-sm font-black text-neutral-900">
                              {s.total.toLocaleString()} {currency}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onViewSaleReceipt(s)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Receipt className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Чекти көрүү</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Aggregated Items Purchased */}
              {detailTab === 'items' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <p className="text-xs text-neutral-500 mb-2">
                    Бул кардар бардык мезгилде дүкөндөн сатып алган техника жана товарлардын жалпы жыйындысы:
                  </p>

                  {activeCustomer.aggregatedItems.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400">
                      <Package className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                      <p className="text-xs font-medium">Товарлар жок</p>
                    </div>
                  ) : (
                    activeCustomer.aggregatedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-neutral-900 truncate">
                              {item.name}
                            </h4>
                            <span className="text-[10px] text-neutral-500">
                              Соңку алганы: {new Date(item.lastBoughtTime).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-neutral-900 block">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700">
                            {item.totalSpent.toLocaleString()} {currency}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Debts & Payments History */}
              {detailTab === 'debts' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {/* Debt Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                      <span className="text-[10px] text-neutral-500 font-semibold block">Жалпы насия суммасы:</span>
                      <span className="text-base font-black text-neutral-900 mt-0.5 block">
                        {(activeCustomer.matchingDebtor?.totalDebt || 0).toLocaleString()} {currency}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-semibold block">Кайтарылган төлөмдөр:</span>
                      <span className="text-base font-black text-emerald-700 mt-0.5 block">
                        +{(activeCustomer.matchingDebtor?.paidAmount || 0).toLocaleString()} {currency}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-amber-800 font-semibold block">Калган карыз калдыгы:</span>
                      <span className="text-base font-black text-amber-900 mt-0.5 block">
                        {activeCustomer.outstandingDebt.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>

                  {/* Early Payer Highlight Banner */}
                  {activeCustomer.isEarlyPayer && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 flex items-start gap-2.5">
                      <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-900 text-xs block">
                          ⭐ МЫКТЫ КАРДАР — Күнүнө жеткирбей мөөнөтүнөн эрте төлөйт!
                        </span>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Бул кардар {activeCustomer.earlyPaymentsCount} жолу карызын белгиленген дедлайндан мурда жапкан. Эң ишенимдүү кардарлардын катарында!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payments List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                      <span className="font-bold text-xs uppercase tracking-wider text-neutral-700">
                        Карыз төлөмдөрүнүн тарыхы
                      </span>
                      {onOpenDebtsTab && (
                        <button
                          type="button"
                          onClick={onOpenDebtsTab}
                          className="text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
                        >
                          <span>Карыз Дептеринен көрүү</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {(!activeCustomer.matchingDebtor || activeCustomer.matchingDebtor.payments.length === 0) ? (
                      <div className="p-6 text-center text-neutral-400 bg-neutral-50 rounded-xl">
                        Карыз төлөмдөрү каттала элек
                      </div>
                    ) : (
                      activeCustomer.matchingDebtor.payments.map((p, idx) => {
                        const pDate = new Date(p.timestamp).toLocaleDateString('ru-RU');
                        const pTime = new Date(p.timestamp).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const dueStr = p.dueDateAtPayment || activeCustomer.matchingDebtor?.dueDate;
                        let isEarly = Boolean(p.paidEarly);
                        let daysEarly = p.daysEarly || 0;

                        if (!isEarly && dueStr) {
                          const dueTime = new Date(`${dueStr}T23:59:59`).getTime();
                          if (p.timestamp < dueTime) {
                            daysEarly = Math.ceil((dueTime - p.timestamp) / 86400000);
                            isEarly = daysEarly >= 1;
                          }
                        }

                        return (
                          <div
                            key={p.id || idx}
                            className="p-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900">
                                  {pDate}, {pTime}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700 text-[10px]">
                                  {p.paymentMethod === 'card' ? 'Карта' : p.paymentMethod === 'qr' ? 'QR' : 'Накталай'}
                                </span>
                              </div>
                              {p.notes && (
                                <p className="text-[11px] text-neutral-500 mt-0.5">
                                  {p.notes}
                                </p>
                              )}
                              {dueStr && (
                                <span className="text-[10px] text-neutral-400 block mt-0.5">
                                  Дедлайн болгон күн: {dueStr}
                                </span>
                              )}
                            </div>

                            <div className="text-right space-y-1">
                              <span className="text-sm font-black text-emerald-700 block">
                                +{p.amount.toLocaleString()} {currency}
                              </span>
                              {isEarly ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Zap className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Күнүнө жетпей төлөнгөн ({daysEarly > 0 ? `${daysEarly} күн эрте` : 'эрте'}) ⭐</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-400">
                                  ✓ Төлөндү
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
              <Users className="w-12 h-12 text-neutral-300 mb-3" />
              <h3 className="font-bold text-neutral-700 text-sm mb-1">
                Кардар тандалган жок
              </h3>
              <p className="text-xs max-w-xs text-neutral-400">
                Сол жактагы тизмеден кардарды басып, анын соода тарыхын, алган бардык товарларын жана чектерин көрүңүз.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-bold text-base text-neutral-900">
                {editingCustomer ? 'Кардарды оңдоо' : 'Жаңы кардар кошуу'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Кардардын аты-жөнү: *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Мисалы: Алмаз Беков"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Ватсап / Телефон номери:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+996 700 12-34-56"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Кошумча эскертүү / дареги:
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Жашаган жери, же башка маанилүү маалымат..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 font-medium">{formError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                >
                  Сактоо
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

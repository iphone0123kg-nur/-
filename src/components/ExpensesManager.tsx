import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, Sale, ShopSettings } from '../types';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  Zap,
  Banknote,
  Droplets,
  Landmark,
  Truck,
  Megaphone,
  Wrench,
  MoreHorizontal,
  Edit2,
  Trash2,
  Download,
  Printer,
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  X,
  Check,
  CreditCard,
  QrCode,
  Coins,
  ChevronDown,
} from 'lucide-react';

interface ExpensesManagerProps {
  expenses: Expense[];
  sales: Sale[];
  settings: ShopSettings;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export const EXPENSE_CATEGORIES_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }
> = {
  rent: {
    label: 'Ижара (Аренда)',
    icon: Building2,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  electricity: {
    label: 'Электр энергиясы (Свет)',
    icon: Zap,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  salary: {
    label: 'Айлык акы (Зарплата)',
    icon: Banknote,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  utilities: {
    label: 'Коммуналдык (Суу, жылуулук)',
    icon: Droplets,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  taxes: {
    label: 'Салык жана патент',
    icon: Landmark,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  transport: {
    label: 'Жеткирүү & Транспорт',
    icon: Truck,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  marketing: {
    label: 'Жарнама & Маркетинг',
    icon: Megaphone,
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
  },
  maintenance: {
    label: 'Чарбалык & Оңдоо',
    icon: Wrench,
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  other: {
    label: 'Башка чыгашалар',
    icon: MoreHorizontal,
    color: 'text-neutral-700',
    bg: 'bg-neutral-100',
    border: 'border-neutral-200',
  },
};

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({
  expenses,
  sales,
  settings,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'month' | 'last30' | 'all'>('month');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Delete Confirmation & Toast State
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const deletedTitle = expenseToDelete.title;
    onDeleteExpense(expenseToDelete.id);
    setExpenseToDelete(null);
    if (isModalOpen && editingExpense?.id === expenseToDelete.id) {
      setIsModalOpen(false);
      setEditingExpense(null);
    }
    setToastMessage(`«${deletedTitle}» чыгымы ийгиликтүү өчүрүлдү`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qr'>('cash');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Open modal for new expense
  const handleOpenAddModal = (presetCategory?: ExpenseCategory) => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setCategory(presetCategory || 'rent');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('cash');
    setPaidTo('');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod);
    setPaidTo(exp.paidTo || '');
    setNotes(exp.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim()) {
      setFormError('Чыгымдын аталышын жазыңыз');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Суммасын 0дөн жогору сан менен киргизиңиз');
      return;
    }
    if (!date) {
      setFormError('Датаны тандаңыз');
      return;
    }

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        title: title.trim(),
        amount: parsedAmount,
        category,
        date,
        paymentMethod,
        paidTo: paidTo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      onAddExpense({
        title: title.trim(),
        amount: parsedAmount,
        category,
        date,
        paymentMethod,
        paidTo: paidTo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  // Current Date Helper References
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentYearMonth = todayStr.slice(0, 7); // "YYYY-MM"
  const thirtyDaysAgoTime = now.getTime() - 30 * 86400000;

  // Filter expenses by selected period & category & search
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Period filter
        if (periodFilter === 'today') {
          if (exp.date !== todayStr) return false;
        } else if (periodFilter === 'month') {
          if (!exp.date.startsWith(currentYearMonth)) return false;
        } else if (periodFilter === 'last30') {
          const expTime = new Date(exp.date).getTime();
          if (expTime < thirtyDaysAgoTime) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
          return false;
        }

        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchTitle = exp.title.toLowerCase().includes(term);
          const matchPaidTo = exp.paidTo?.toLowerCase().includes(term);
          const matchNotes = exp.notes?.toLowerCase().includes(term);
          const matchCategory = EXPENSE_CATEGORIES_CONFIG[exp.category]?.label.toLowerCase().includes(term);
          if (!matchTitle && !matchPaidTo && !matchNotes && !matchCategory) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, periodFilter, selectedCategory, searchTerm, todayStr, currentYearMonth, thirtyDaysAgoTime]);

  // Financial Net Profit calculation for the SAME period filter
  const financialMetrics = useMemo(() => {
    // 1. Filter completed sales by the same period
    const relevantSales = sales.filter((s) => {
      if (s.status !== 'completed') return false;
      const sDateStr = new Date(s.timestamp).toISOString().slice(0, 10);
      if (periodFilter === 'today') {
        return sDateStr === todayStr;
      } else if (periodFilter === 'month') {
        return sDateStr.startsWith(currentYearMonth);
      } else if (periodFilter === 'last30') {
        return s.timestamp >= thirtyDaysAgoTime;
      }
      return true; // 'all'
    });

    const salesRevenue = relevantSales.reduce((acc, s) => acc + s.total, 0);
    const salesCost = relevantSales.reduce((acc, s) => acc + s.costTotal, 0);
    const grossProfit = salesRevenue - salesCost; // Дүң пайда (Маржа)

    // 2. Sum of expenses in the current period
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

    // 3. Category Breakdown for selected period
    const rentTotal = filteredExpenses
      .filter((e) => e.category === 'rent')
      .reduce((acc, e) => acc + e.amount, 0);
    const electricityTotal = filteredExpenses
      .filter((e) => e.category === 'electricity')
      .reduce((acc, e) => acc + e.amount, 0);
    const salaryTotal = filteredExpenses
      .filter((e) => e.category === 'salary')
      .reduce((acc, e) => acc + e.amount, 0);
    const otherTotal = totalExpenses - rentTotal - electricityTotal - salaryTotal;

    // 4. NET PROFIT (НЕТТО ТАЗА ПАЙДА = Дүң пайда - Бардык чыгымдар)
    const netProfit = grossProfit - totalExpenses;
    const netMarginPercent = salesRevenue > 0 ? Number(((netProfit / salesRevenue) * 100).toFixed(1)) : 0;

    return {
      salesRevenue,
      salesCost,
      grossProfit,
      totalExpenses,
      rentTotal,
      electricityTotal,
      salaryTotal,
      otherTotal,
      netProfit,
      netMarginPercent,
      salesCount: relevantSales.length,
      expenseCount: filteredExpenses.length,
    };
  }, [sales, filteredExpenses, periodFilter, todayStr, currentYearMonth, thirtyDaysAgoTime]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Дата',
      'Чыгымдын аталышы',
      'Категория',
      'Суммасы (сом)',
      'Төлөм ыкмасы',
      'Кимге төлөндү',
      'Эскертүү',
    ];
    const rows = filteredExpenses.map((exp) => [
      exp.date,
      `"${exp.title.replace(/"/g, '""')}"`,
      `"${EXPENSE_CATEGORIES_CONFIG[exp.category]?.label || exp.category}"`,
      exp.amount,
      exp.paymentMethod === 'cash' ? 'Накталай' : exp.paymentMethod === 'card' ? 'Банк картасы' : 'QR / MBank',
      `"${(exp.paidTo || '').replace(/"/g, '""')}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Dukon_Chygymdary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodLabels = {
    today: 'Бүгүн',
    month: 'Ушул ай',
    last30: 'Соңку 30 күн',
    all: 'Бардык мезгил',
  };

  return (
    <div id="expenses-manager-module" className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100 relative">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-neutral-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="bg-white border-b border-neutral-200 p-4 sm:p-6 space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                Дүкөндүн Чыгымдарын Башкаруу & Таза Пайда (Нетто)
              </h1>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Ижара, электр энергиясы, кызматкерлердин айлыгы ж.б. чыгымдарды эске алып, таза кирешени (нетто) так эсептөө
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Жаңы чыгым кошуу</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="CSV форматында жүктөө"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Экспорт</span>
            </button>
          </div>
        </div>

        {/* Quick Add Presets Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-neutral-400 font-semibold whitespace-nowrap mr-1">Тез кошуу:</span>
          <button
            onClick={() => handleOpenAddModal('rent')}
            className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 font-medium whitespace-nowrap flex items-center gap-1 transition"
          >
            <Building2 className="w-3 h-3 text-purple-600" />
            + Ижара
          </button>
          <button
            onClick={() => handleOpenAddModal('electricity')}
            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium whitespace-nowrap flex items-center gap-1 transition"
          >
            <Zap className="w-3 h-3 text-amber-600" />
            + Электр энергиясы
          </button>
          <button
            onClick={() => handleOpenAddModal('salary')}
            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-medium whitespace-nowrap flex items-center gap-1 transition"
          >
            <Banknote className="w-3 h-3 text-blue-600" />
            + Айлык акы
          </button>
          <button
            onClick={() => handleOpenAddModal('transport')}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-medium whitespace-nowrap flex items-center gap-1 transition"
          >
            <Truck className="w-3 h-3 text-emerald-600" />
            + Жеткирүү
          </button>
          <button
            onClick={() => handleOpenAddModal('taxes')}
            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-medium whitespace-nowrap flex items-center gap-1 transition"
          >
            <Landmark className="w-3 h-3 text-rose-600" />
            + Патент/Салык
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5">
        {/* KPI 1: FINANCIAL BALANCE & NETTO PROFIT CALCULATOR BOX */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-850 to-neutral-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-neutral-700/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-700/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Финансылык Жыйынтык & Таза Пайда (НЕТТО)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-neutral-200 border border-white/10">
                  {periodLabels[periodFilter]}
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-1">
                Сооданын дүң пайдасынан дүкөндүн бардык операциялык чыгымдарын кемиткенден кийинки накта пайда
              </p>
            </div>

            {/* Period Switcher */}
            <div className="flex items-center bg-neutral-800/90 p-1 rounded-xl border border-neutral-700 overflow-x-auto scrollbar-none shrink-0">
              {(['today', 'month', 'last30', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    periodFilter === p
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* NET PROFIT FORMULA GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
            {/* Step 1: Gross Revenue & Profit */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                1. Соодадан Дүң Пайда (Маржа)
              </span>
              <div className="my-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  +{financialMetrics.grossProfit.toLocaleString()} {settings.currency}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Түшүм: {financialMetrics.salesRevenue.toLocaleString()} {settings.currency}
                </div>
              </div>
              <span className="text-[10px] text-neutral-400">
                Закупка кемитилген ({financialMetrics.salesCount} сатуу)
              </span>
            </div>

            {/* Step 2: Total Store Expenses */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                2. Дүкөндүн Чыгымдары (-)
              </span>
              <div className="my-2">
                <div className="text-xl sm:text-2xl font-black text-rose-400">
                  -{financialMetrics.totalExpenses.toLocaleString()} {settings.currency}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {financialMetrics.expenseCount} чыгым катталган
                </div>
              </div>
              <span className="text-[10px] text-neutral-400">
                Ижара, свет, айлык ж.б. бардыгы
              </span>
            </div>

            {/* Step 3: Main Expense Drivers */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between text-xs space-y-1.5">
              <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                Негизги чыгым түрлөрү:
              </span>
              <div className="flex justify-between text-neutral-300">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-purple-400" /> Ижара:
                </span>
                <span className="font-bold">{financialMetrics.rentTotal.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Электр:
                </span>
                <span className="font-bold">{financialMetrics.electricityTotal.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-blue-400" /> Айлык:
                </span>
                <span className="font-bold">{financialMetrics.salaryTotal.toLocaleString()} {settings.currency}</span>
              </div>
            </div>

            {/* Step 4: TRUE NET PROFIT (НЕТТО ТАЗА ПАЙДА) */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                financialMetrics.netProfit >= 0
                  ? 'bg-emerald-950/60 border-emerald-500/50'
                  : 'bg-rose-950/60 border-rose-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  3. ТАЗА КИРЕШЕ (НЕТТО)
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    financialMetrics.netProfit >= 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  Рентабелдүүлүк: {financialMetrics.netMarginPercent}%
                </span>
              </div>

              <div className="my-2">
                <div
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    financialMetrics.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {financialMetrics.netProfit >= 0 ? '+' : ''}
                  {financialMetrics.netProfit.toLocaleString()} {settings.currency}
                </div>
                <div className="text-[11px] text-neutral-300 mt-1">
                  Формула: Дүң пайда ({financialMetrics.grossProfit.toLocaleString()}) - Чыгымдар ({financialMetrics.totalExpenses.toLocaleString()})
                </div>
              </div>

              <span className="text-[10px] text-neutral-300">
                {financialMetrics.netProfit >= 0
                  ? 'Дүкөн плюс менен иштеп жатат'
                  : 'Эскертүү: Чыгымдар дүң пайдадан ашып кетти'}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses List & Filtering Section */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/70 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Чыгымдын аты, кимге төлөндү же эскертүүсү боюнча издөө..."
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-neutral-500 font-medium">Категория:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs py-2 px-3 bg-white border border-neutral-300 rounded-xl font-medium text-neutral-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="all">Бардык категориялар</option>
                  <option value="rent">Ижара (Аренда)</option>
                  <option value="electricity">Электр энергиясы (Свет)</option>
                  <option value="salary">Айлык акы (Зарплата)</option>
                  <option value="utilities">Башка коммуналдык</option>
                  <option value="taxes">Салык жана патент</option>
                  <option value="transport">Жеткирүү & Транспорт</option>
                  <option value="marketing">Жарнама & Маркетинг</option>
                  <option value="maintenance">Чарбалык & Оңдоо</option>
                  <option value="other">Башка чыгашалар</option>
                </select>
              </div>
            </div>

            {/* Category Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Бардыгы ({expenses.length})
              </button>
              {(Object.keys(EXPENSE_CATEGORIES_CONFIG) as ExpenseCategory[]).map((catKey) => {
                const cfg = EXPENSE_CATEGORIES_CONFIG[catKey];
                const count = expenses.filter((e) => e.category === catKey).length;
                if (count === 0 && selectedCategory !== catKey) return null;
                const Icon = cfg.icon;
                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
                      selectedCategory === catKey
                        ? `${cfg.bg} ${cfg.color} border ${cfg.border} ring-2 ring-emerald-500`
                        : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cfg.label}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Cards View (phone & portrait screens) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 px-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Wallet className="w-8 h-8 text-neutral-300" />
                  <p className="text-xs font-medium text-neutral-600">
                    Бул шартка ылайык чыгымдар табылган жок
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    className="mt-1 text-xs text-emerald-600 hover:underline font-bold"
                  >
                    + Биринчи чыгымды кошуу
                  </button>
                </div>
              </div>
            ) : (
              filteredExpenses.map((exp) => {
                const cfg = EXPENSE_CATEGORIES_CONFIG[exp.category] || EXPENSE_CATEGORIES_CONFIG.other;
                const Icon = cfg.icon;

                return (
                  <div key={exp.id} className="p-3.5 space-y-2 hover:bg-neutral-50/70 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-bold text-neutral-900 text-sm block">
                          {exp.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{cfg.label}</span>
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500 font-medium">
                            {exp.date}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-rose-600 text-sm sm:text-base">
                          -{exp.amount.toLocaleString()} {settings.currency}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-medium">
                          {exp.paymentMethod === 'cash'
                            ? 'Накталай'
                            : exp.paymentMethod === 'card'
                            ? 'Банк картасы'
                            : 'MBank / QR'}
                        </div>
                      </div>
                    </div>

                    {(exp.paidTo || exp.notes) && (
                      <div className="text-[11px] text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/80 space-y-1">
                        {exp.paidTo && (
                          <div className="flex items-center gap-1">
                            <span className="text-neutral-400">Кимге:</span>
                            <span className="font-semibold text-neutral-800">{exp.paidTo}</span>
                          </div>
                        )}
                        {exp.notes && (
                          <div className="text-neutral-600">
                            <span className="text-neutral-400">Эскертүү:</span> {exp.notes}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(exp)}
                        className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Оңдоо</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseToDelete(exp)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Өчүрүү</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Expenses Table (Desktop & Tablets) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Дата</th>
                  <th className="py-3 px-3">Чыгымдын аталышы</th>
                  <th className="py-3 px-3">Категория</th>
                  <th className="py-3 px-3 text-right">Суммасы</th>
                  <th className="py-3 px-3">Төлөм ыкмасы</th>
                  <th className="py-3 px-3">Кимге төлөндү</th>
                  <th className="py-3 px-3">Эскертүү</th>
                  <th className="py-3 px-4 text-center">Аракеттер</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wallet className="w-8 h-8 text-neutral-300" />
                        <p className="text-sm font-medium text-neutral-600">
                          Бул шартка ылайык чыгымдар табылган жок
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal()}
                          className="mt-1 text-xs text-emerald-600 hover:underline font-bold"
                        >
                          + Биринчи чыгымды кошуу
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const cfg = EXPENSE_CATEGORIES_CONFIG[exp.category] || EXPENSE_CATEGORIES_CONFIG.other;
                    const Icon = cfg.icon;

                    return (
                      <tr key={exp.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3 px-4 font-mono font-medium text-neutral-700 whitespace-nowrap">
                          {exp.date}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-neutral-900 block text-xs sm:text-sm">
                            {exp.title}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{cfg.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="font-black text-rose-600 text-sm">
                            -{exp.amount.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 capitalize">
                            {exp.paymentMethod === 'cash' && (
                              <>
                                <Coins className="w-3.5 h-3.5 text-amber-600" />
                                <span>Накталай</span>
                              </>
                            )}
                            {exp.paymentMethod === 'card' && (
                              <>
                                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                <span>Банк картасы</span>
                              </>
                            )}
                            {exp.paymentMethod === 'qr' && (
                              <>
                                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                                <span>MBank / QR</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-neutral-600 text-[11px]">
                          {exp.paidTo || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="py-3 px-3 text-neutral-500 text-[11px] max-w-xs truncate">
                          {exp.notes || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(exp)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                              title="Оңдоо"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(exp)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Өчүрүү"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Table Footer Summary */}
          {filteredExpenses.length > 0 && (
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-neutral-500">
                Жалпы: <b>{filteredExpenses.length}</b> чыгым тизмеленди
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-700">Тандалган мезгилдин чыгымы:</span>
                <span className="font-black text-rose-700 text-sm">
                  {filteredExpenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div
          id="expense-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id="expense-modal-dialog"
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-auto border border-neutral-200 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-neutral-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base sm:text-lg">
                  {editingExpense ? 'Чыгымды оңдоо' : 'Жаңы чыгым кошуу'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto text-xs sm:text-sm">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Чыгымдын аталышы *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Мисалы: Сентябрь айынын соода залынын ижарасы"
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium text-neutral-900"
                />
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Суммасы ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-black text-rose-600 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Датасы *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Чыгымдын категориясы *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(EXPENSE_CATEGORIES_CONFIG) as ExpenseCategory[]).map((catKey) => {
                    const cfg = EXPENSE_CATEGORIES_CONFIG[catKey];
                    const Icon = cfg.icon;
                    const isSelected = category === catKey;

                    return (
                      <button
                        type="button"
                        key={catKey}
                        onClick={() => setCategory(catKey)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                          isSelected
                            ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-emerald-500 font-bold`
                            : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] leading-tight truncate">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Төлөм кайсы эсептен жүрдү? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      paymentMethod === 'cash'
                        ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-emerald-500'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>Накталай</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      paymentMethod === 'card'
                        ? 'bg-blue-50 text-blue-900 border-blue-300 ring-2 ring-emerald-500'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Банк картасы</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      paymentMethod === 'qr'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>MBank / QR</span>
                  </button>
                </div>
              </div>

              {/* Paid To & Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Кимге же кайсы мекемеге төлөндү? (милдеттүү эмес)
                </label>
                <input
                  type="text"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  placeholder="Мисалы: «Түндүкэлектро», «Азия Инвест» соода борбору"
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Кошумча эскертүү (милдеттүү эмес)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Чектин номери, эсеп-фактура же кошумча маалымат..."
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                {editingExpense ? (
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseToDelete(editingExpense);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Чыгымды өчүрүү</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs transition"
                  >
                    Жокко чыгаруу
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingExpense ? 'Өзгөртүүнү сактоо' : 'Чыгымды кошуу'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EXPENSE MODAL */}
      {expenseToDelete && (
        <div
          id="delete-expense-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setExpenseToDelete(null)}
        >
          <div
            id="delete-expense-dialog"
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-200 p-6 space-y-4 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-neutral-900 text-base sm:text-lg">
                  Чыгымды өчүрүүнү ырастаңыз
                </h3>
                <p className="text-xs text-neutral-500">
                  Адашып же ката жазылып калган чыгашаны өчүрүү
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-neutral-700">
                <span className="text-neutral-500">Чыгымдын аталышы:</span>
                <span className="font-bold text-neutral-900 text-right max-w-[200px] truncate">
                  {expenseToDelete.title}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-700">
                <span className="text-neutral-500">Суммасы:</span>
                <span className="font-black text-rose-600 text-sm">
                  -{expenseToDelete.amount.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-700">
                <span className="text-neutral-500">Датасы:</span>
                <span className="font-mono font-medium">{expenseToDelete.date}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-700">
                <span className="text-neutral-500">Категориясы:</span>
                <span className="font-semibold text-neutral-800">
                  {EXPENSE_CATEGORIES_CONFIG[expenseToDelete.category]?.label || expenseToDelete.category}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Бул чыгым тизмеден толук өчүрүлөт жана дүкөндүн <b>Таза кирешеси (Нетто пайда)</b> кайрадан автоматтык түрдө жаңыртылат.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs transition"
              >
                Жок, калтыруу
              </button>
              <button
                type="button"
                id="confirm-delete-expense-btn"
                onClick={confirmDeleteExpense}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ооба, өчүрүү</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

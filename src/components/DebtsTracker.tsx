import React, { useState, useMemo } from 'react';
import { Debtor, ShopSettings, Sale, DebtPayment } from '../types';
import {
  BookOpen,
  UserPlus,
  Plus,
  CheckCircle,
  Phone,
  Search,
  DollarSign,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  MessageCircle,
  Printer,
  FileText,
  Clock,
  Zap,
  Sparkles,
  ArrowRight,
  Eye,
  CheckCircle2,
  CalendarDays,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

interface DebtsTrackerProps {
  debtors: Debtor[];
  sales?: Sale[];
  settings: ShopSettings;
  onPayDebt: (
    debtorId: string,
    amount: number,
    method: 'cash' | 'card' | 'qr',
    notes?: string
  ) => void;
  onAddManualDebt: (
    name: string,
    phone: string,
    amount: number,
    notes?: string,
    dueDate?: string
  ) => void;
  onViewSaleReceipt?: (sale: Sale) => void;
}

export const DebtsTracker: React.FC<DebtsTrackerProps> = ({
  debtors,
  sales = [],
  settings,
  onPayDebt,
  onAddManualDebt,
  onViewSaleReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'paid' | 'early_payers'>('all');

  // Pay Modal
  const [payModalDebtor, setPayModalDebtor] = useState<Debtor | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'qr'>('cash');
  const [payNotes, setPayNotes] = useState('');

  // Add Manual Debt Modal
  const [addDebtModalOpen, setAddDebtModalOpen] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtPhone, setNewDebtPhone] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtNotes, setNewDebtNotes] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');

  // Detailed Customer Debt Profile Modal
  const [selectedDebtorForDetails, setSelectedDebtorForDetails] = useState<Debtor | null>(null);

  // Helper: check if debtor has early payments
  const hasEarlyPayments = (debtor: Debtor): boolean => {
    return debtor.payments.some((p) => {
      if (p.paidEarly) return true;
      const dueStr = p.dueDateAtPayment || debtor.dueDate;
      if (dueStr) {
        const dueTime = new Date(`${dueStr}T23:59:59`).getTime();
        return p.timestamp < dueTime;
      }
      return false;
    });
  };

  // Filtered Debtors
  const filteredDebtors = useMemo(() => {
    return debtors.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone.includes(searchTerm);
      if (!matchSearch) return false;

      if (filterType === 'unpaid') return d.balance > 0;
      if (filterType === 'paid') return d.balance === 0 && d.totalDebt > 0;
      if (filterType === 'early_payers') return hasEarlyPayments(d);
      return true;
    });
  }, [debtors, searchTerm, filterType]);

  const totalOutstanding = debtors.reduce((acc, d) => acc + d.balance, 0);
  const totalPaidSum = debtors.reduce((acc, d) => acc + d.paidAmount, 0);
  const earlyPayersCount = debtors.filter((d) => hasEarlyPayments(d)).length;

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalDebtor) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    onPayDebt(payModalDebtor.id, amount, payMethod, payNotes);
    setPayModalDebtor(null);
    setPayAmount('');
    setPayNotes('');
    // If details modal was open for this debtor, update it
    if (selectedDebtorForDetails && selectedDebtorForDetails.id === payModalDebtor.id) {
      const refreshed = debtors.find((d) => d.id === payModalDebtor.id);
      if (refreshed) {
        setSelectedDebtorForDetails(refreshed);
      }
    }
  };

  const handleAddManualDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtName.trim()) return;
    const amount = parseFloat(newDebtAmount) || 0;
    if (amount <= 0) return;
    onAddManualDebt(
      newDebtName.trim(),
      newDebtPhone.trim(),
      amount,
      newDebtNotes.trim(),
      newDebtDueDate.trim() || undefined
    );
    setAddDebtModalOpen(false);
    setNewDebtName('');
    setNewDebtPhone('');
    setNewDebtAmount('');
    setNewDebtNotes('');
    setNewDebtDueDate('');
  };

  // Helper to find sales matching a debtor
  const getDebtorSales = (debtor: Debtor): Sale[] => {
    const debtorSaleIds = new Set(debtor.saleIds || []);
    const cleanPhone = debtor.phone.replace(/[^\d]/g, '');
    const cleanName = debtor.name.toLowerCase().trim();

    return sales.filter((s) => {
      if (debtorSaleIds.has(s.id)) return true;
      if (s.customerPhone && cleanPhone && s.customerPhone.replace(/[^\d]/g, '') === cleanPhone) {
        return true;
      }
      if (s.customerName && cleanName && s.customerName.toLowerCase().trim() === cleanName) {
        return true;
      }
      return false;
    });
  };

  // Format payment early label
  const getEarlyPaymentBadge = (p: DebtPayment, debtorDueDate?: string) => {
    const dueStr = p.dueDateAtPayment || debtorDueDate;
    let isEarly = Boolean(p.paidEarly);
    let daysEarly = p.daysEarly || 0;

    if (!isEarly && dueStr) {
      const dueTime = new Date(`${dueStr}T23:59:59`).getTime();
      if (p.timestamp < dueTime) {
        daysEarly = Math.ceil((dueTime - p.timestamp) / 86400000);
        isEarly = daysEarly >= 1;
      }
    }

    if (isEarly) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Zap className="w-3 h-3 text-emerald-600" />
          <span>Күнүнө жетпей төлөнгөн ({daysEarly > 0 ? `${daysEarly} күн эрте` : 'эрте'}) ⭐</span>
        </span>
      );
    }

    if (dueStr) {
      const dueTime = new Date(`${dueStr}T23:59:59`).getTime();
      if (p.timestamp > dueTime + 86400000) {
        const daysLate = Math.ceil((p.timestamp - dueTime) / 86400000);
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
            <Clock className="w-3 h-3 text-red-600" />
            <span>Кечигип төлөнгөн ({daysLate} күн)</span>
          </span>
        );
      }
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
        <CheckCircle2 className="w-3 h-3 text-neutral-500" />
        <span>Кабыл алынды</span>
      </span>
    );
  };

  // Send WhatsApp Full Statement
  const handleSendWhatsAppStatement = (debtor: Debtor) => {
    const cleanPhone = (debtor.phone || '').replace(/[^\d]/g, '');
    if (!cleanPhone) {
      alert('Кардардын телефон номери жазылган эмес!');
      return;
    }

    const debtorSales = getDebtorSales(debtor);
    let itemsText = '';
    if (debtorSales.length > 0) {
      itemsText = debtorSales
        .map((s) => {
          const dateStr = new Date(s.timestamp).toLocaleDateString('ru-RU');
          const goods = s.items.map((i) => `${i.name} (${i.quantity} ${i.unit || 'даана'})`).join(', ');
          const paidPart = s.paidNowAmount || 0;
          return `• ${dateStr} алган товарлары: ${goods}\n  Чек суммасы: ${s.total.toLocaleString()} ${settings.currency}\n  Сатуу күнү төлөнгөн аванс: ${paidPart.toLocaleString()} ${settings.currency}\n  Калган карыз: ${(s.total - paidPart).toLocaleString()} ${settings.currency}`;
        })
        .join('\n\n');
    }

    let paymentsText = '';
    if (debtor.payments.length > 0) {
      paymentsText = debtor.payments
        .map((p) => {
          const dateStr = new Date(p.timestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const dueStr = p.dueDateAtPayment || debtor.dueDate;
          let earlyNote = '';
          if (p.paidEarly || (dueStr && p.timestamp < new Date(`${dueStr}T23:59:59`).getTime())) {
            earlyNote = ' (Күнүнө жетпей мөөнөтүнөн эрте төлөндү ⭐)';
          }
          return `• ${dateStr} күнү төлөндү: ${p.amount.toLocaleString()} ${settings.currency}${earlyNote}`;
        })
        .join('\n');
    }

    const msg = `📋 *КАРЫЗ ЖАНА ТӨЛӨМДӨР БОЮНЧА ОТЧЕТ*
Дүкөн: *${settings.shopName || 'Техно Дүкөн'}*
Кардар: *${debtor.name}*
Дата: ${new Date().toLocaleDateString('ru-RU')}

*1. АЛЫНГАН ТОВАРЛАР ЖАНА КАРЫЗ:*
${itemsText || `Жалпы эсептелген сумма: ${debtor.totalDebt.toLocaleString()} ${settings.currency}`}
${debtor.dueDate ? `Кайтаруу мөөнөтү (дедлайн): ${debtor.dueDate}` : ''}

*2. ТӨЛӨНГӨН КАРЫЗДАР ТАРЫХЫ:*
${paymentsText || 'Төлөмдөр азырынча жок.'}

---------------------------------------
💰 Жалпы карыз: ${debtor.totalDebt.toLocaleString()} ${settings.currency}
✅ Төлөнгөн сумма: ${debtor.paidAmount.toLocaleString()} ${settings.currency}
❗ *КАЛГАН КАРЫЗ: ${debtor.balance.toLocaleString()} ${settings.currency}*
---------------------------------------
${debtor.balance === 0 ? '🎉 Сиздин карызыңыз толугу менен жабылган! Кызматташтык үчүн чоң рахмат!' : 'Төлөмдү убагында жүргүзгөнүңүз үчүн алдын ала рахмат!'}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Print Statement
  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div id="debts-tracker-view" className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100 p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-600" />
              <span>Карыз Дептери (Насия эсептери)</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Кардарлардын алган товарлары, төлөмдөрү, мөөнөтүнөн эрте жабылган карыздары жана толук отчету
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddDebtModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Кол менен карыз жазуу</span>
            </button>
          </div>
        </div>

        {/* Metric summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <span className="text-xs font-medium text-amber-800">Жалпы калган карыз:</span>
            <div className="text-2xl font-black text-amber-900 mt-1">
              {totalOutstanding.toLocaleString()} {settings.currency}
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">
              {debtors.filter((d) => d.balance > 0).length} кардар карыз
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <span className="text-xs font-medium text-emerald-800">Кайтарылган / Төлөнгөн сумма:</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {totalPaidSum.toLocaleString()} {settings.currency}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Кассага кирген акча каражаты
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <span className="text-xs font-medium text-blue-800">Жалпы насия берилген:</span>
            <div className="text-2xl font-black text-blue-900 mt-1">
              {debtors.reduce((acc, d) => acc + d.totalDebt, 0).toLocaleString()} {settings.currency}
            </div>
            <div className="text-[11px] text-blue-700 mt-0.5">
              {debtors.length} кардардын эсеби
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
              <span>Эрте төлөгөн мыктылар:</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              {earlyPayersCount} кардар
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              ⭐ Күнүнө жетпей төлөшөт
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-1">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Бардыгы ({debtors.length})
            </button>
            <button
              onClick={() => setFilterType('unpaid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                filterType === 'unpaid'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Карызы барлар ({debtors.filter((d) => d.balance > 0).length})
            </button>
            <button
              onClick={() => setFilterType('early_payers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap ${
                filterType === 'early_payers'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Эрте төлөгөндөр ({earlyPayersCount})</span>
            </button>
            <button
              onClick={() => setFilterType('paid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                filterType === 'paid'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Толук жабылгандар ({debtors.filter((d) => d.balance === 0 && d.totalDebt > 0).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Аты же телефону боюнча издөө..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="flex-1 overflow-auto bg-white rounded-2xl border border-neutral-200 shadow-2xs">
        <table className="w-full text-left text-xs min-w-[840px]">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[11px] sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4">Кардардын аты</th>
              <th className="py-3 px-3">Телефон / WhatsApp</th>
              <th className="py-3 px-3 text-right">Жалпы карыз</th>
              <th className="py-3 px-3 text-right">Төлөндү</th>
              <th className="py-3 px-3 text-right font-bold">Калган карыз</th>
              <th className="py-3 px-3">Кайтаруу мөөнөтү</th>
              <th className="py-3 px-3 text-center">Төлөө тартиби</th>
              <th className="py-3 px-4 text-center">Аракеттер</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredDebtors.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-neutral-400">
                  Талапка дал келген кардарлар табылган жок
                </td>
              </tr>
            ) : (
              filteredDebtors.map((d) => {
                const cleanPhone = (d.phone || '').replace(/[^\d]/g, '');
                const isEarly = hasEarlyPayments(d);

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-neutral-50/80 transition cursor-pointer"
                    onClick={() => setSelectedDebtorForDetails(d)}
                  >
                    <td className="py-3 px-4 font-bold text-neutral-900">
                      <div className="flex items-center gap-2">
                        <span>{d.name}</span>
                        {isEarly && (
                          <span
                            title="Бул кардар карызды күнүнө жеткирбей, эрте төлөйт!"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                          >
                            <Zap className="w-3 h-3 text-emerald-600" />
                            <span>Мыкты кардар</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-neutral-600" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        <span>{d.phone || '—'}</span>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition ml-0.5"
                            title="WhatsApp аркылуу жазуу"
                          >
                            <MessageCircle className="w-2.5 h-2.5" />
                            <span>WA</span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-600">
                      {d.totalDebt.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                      +{d.paidAmount.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md ${
                          d.balance > 0
                            ? 'bg-amber-100 text-amber-900 font-black'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {d.balance.toLocaleString()} {settings.currency}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {d.dueDate && d.balance > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <Calendar className="w-3 h-3 text-red-500" />
                          <span>{d.dueDate}</span>
                        </span>
                      ) : d.dueDate ? (
                        <span className="text-neutral-500 text-[11px]">{d.dueDate}</span>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isEarly ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>Күнүнө жетпей төлөйт</span>
                        </span>
                      ) : d.balance === 0 ? (
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          Толук жабылган
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">Убагында</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedDebtorForDetails(d)}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-medium text-xs flex items-center gap-1 transition"
                          title="Толук маалыматты жана тарыхты көрүү"
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Отчет</span>
                        </button>

                        {d.balance > 0 ? (
                          <button
                            onClick={() => {
                              setPayModalDebtor(d);
                              setPayAmount(d.balance.toString());
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Төлөө</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendWhatsAppStatement(d)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="WhatsApp көчүрмөсүн жөнөтүү"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* DETAILED CUSTOMER DEBT STATEMENT MODAL (Толук маалымат / Отчет) */}
      {/* ======================================================== */}
      {selectedDebtorForDetails && (() => {
        const d = selectedDebtorForDetails;
        const debtorSales = getDebtorSales(d);
        const isEarly = hasEarlyPayments(d);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-neutral-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg">
                    {d.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black">{d.name}</h3>
                      {isEarly && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>Мыкты кардар (Күнүнө жетпей төлөйт)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-300 mt-0.5">
                      <span className="font-mono">{d.phone || 'Телефон жок'}</span>
                      {d.phone && (
                        <button
                          onClick={() => handleSendWhatsAppStatement(d)}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp отчет жөнөтүү</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintStatement}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition"
                    title="Отчетту басып чыгаруу (Печать)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedDebtorForDetails(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1">
                {/* Balance Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-neutral-500 text-[11px] block">Жалпы алынган товар суммасы:</span>
                    <span className="text-lg font-black text-neutral-900 mt-0.5 block">
                      {d.totalDebt.toLocaleString()} {settings.currency}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-800 text-[11px] block">Төлөнгөн сумма:</span>
                    <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                      +{d.paidAmount.toLocaleString()} {settings.currency}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-amber-800 text-[11px] block">Калган карыз:</span>
                    <span className="text-lg font-black text-amber-900 mt-0.5 block">
                      {d.balance.toLocaleString()} {settings.currency}
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-neutral-500 text-[11px] block">Кайтаруу мөөнөтү (Дедлайн):</span>
                    <span className="text-sm font-bold text-neutral-800 mt-1 block flex items-center gap-1">
                      <CalendarDays className="w-4 h-4 text-neutral-500" />
                      <span>{d.dueDate || 'Белгиленген эмес'}</span>
                    </span>
                  </div>
                </div>

                {/* Section 1: Goods Purchased on Credit (Алган товарлары жана чектер) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                      <span>1. Карызга алынган товарлар жана чектер</span>
                    </h4>
                    <span className="text-neutral-400 text-[11px]">
                      {debtorSales.length > 0 ? `${debtorSales.length} чек табылды` : 'Катталган маалымат'}
                    </span>
                  </div>

                  {debtorSales.length > 0 ? (
                    <div className="space-y-3">
                      {debtorSales.map((sale) => {
                        const paidNow = sale.paidNowAmount || 0;
                        const remainingDebt =
                          sale.debtAmount !== undefined ? sale.debtAmount : sale.total - paidNow;
                        const saleDate = new Date(sale.timestamp).toLocaleDateString('ru-RU');
                        const saleTime = new Date(sale.timestamp).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <div
                            key={sale.id}
                            className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-neutral-900">
                                  Чек № {sale.id.slice(-6)}
                                </span>
                                <span className="text-neutral-400">•</span>
                                <span className="text-neutral-600 font-medium">
                                  {saleDate}, {saleTime}
                                </span>
                              </div>

                              {onViewSaleReceipt && (
                                <button
                                  onClick={() => onViewSaleReceipt(sale)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-[11px]"
                                >
                                  <span>Чек квитанциясын көрүү</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Item list */}
                            <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-1">
                              {sale.items.map((it, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-xs py-0.5 border-b border-neutral-100 last:border-0"
                                >
                                  <span className="font-medium text-neutral-800">
                                    {it.name}
                                  </span>
                                  <div className="text-neutral-600 space-x-2">
                                    <span>
                                      {it.quantity} {it.unit || 'даана'} × {it.salePrice.toLocaleString()}{' '}
                                      {settings.currency}
                                    </span>
                                    <span className="font-bold text-neutral-900">
                                      = {it.total.toLocaleString()} {settings.currency}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Purchase Summary in User's Requested Example Format */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                              <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                                <span className="text-blue-700 text-[10px] block">Жалпы суммасы:</span>
                                <span className="font-black text-neutral-900">
                                  {sale.total.toLocaleString()} {settings.currency}
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                                <span className="text-emerald-700 text-[10px] block">
                                  Сатуу күнү төлөнгөн ({saleDate}):
                                </span>
                                <span className="font-bold text-emerald-800">
                                  {paidNow.toLocaleString()} {settings.currency}{' '}
                                  <span className="text-[10px] font-normal text-emerald-600">
                                    ({sale.paidNowMethod === 'card' ? 'Карта' : sale.paidNowMethod === 'qr' ? 'QR' : 'Накталай'})
                                  </span>
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                                <span className="text-amber-700 text-[10px] block">
                                  Калган карыз (Мөөнөтү: {sale.debtDueDate || d.dueDate || '—'}):
                                </span>
                                <span className="font-black text-amber-900">
                                  {remainingDebt.toLocaleString()} {settings.currency}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-neutral-900">Кол менен жазылган карыз</span>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Катталган убактысы: {new Date(d.createdAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-neutral-500 block">Карыз суммасы:</span>
                          <span className="font-black text-sm text-neutral-900">
                            {d.totalDebt.toLocaleString()} {settings.currency}
                          </span>
                        </div>
                      </div>
                      {d.dueDate && (
                        <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded inline-block">
                          Төлөө мөөнөтү: <b>{d.dueDate}</b> чейин
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Payments History & Early Payment Tracking (Төлөнгөн карыздар тарыхы) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>2. Төлөнгөн карыздар тарыхы жана мөөнөттөрү</span>
                    </h4>
                    <span className="text-emerald-700 font-bold text-xs">
                      Жалпы төлөндү: +{d.paidAmount.toLocaleString()} {settings.currency}
                    </span>
                  </div>

                  {d.payments.length === 0 ? (
                    <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-center text-neutral-400">
                      Азырынча карыз төлөмдөрү жүргүзүлө элек
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {d.payments.map((p, idx) => {
                        const pDate = new Date(p.timestamp).toLocaleDateString('ru-RU');
                        const pTime = new Date(p.timestamp).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const methodLabels: Record<string, string> = {
                          cash: 'Накталай',
                          card: 'Карта',
                          qr: 'MBank / QR',
                        };

                        return (
                          <div
                            key={p.id || idx}
                            className="p-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900">
                                  {pDate}, {pTime}
                                </span>
                                <span className="px-2 py-0.2 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-medium">
                                  {methodLabels[p.paymentMethod] || p.paymentMethod}
                                </span>
                              </div>
                              {p.notes && (
                                <p className="text-[11px] text-neutral-500">
                                  Эскертүү: {p.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {getEarlyPaymentBadge(p, d.dueDate)}

                              <span className="font-black text-sm text-emerald-700">
                                +{p.amount.toLocaleString()} {settings.currency}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* WhatsApp & Print Actions Banner */}
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>Кардарга отчет жана сверка жөнөтүү</span>
                    </h5>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Алган товарлары, төлөнгөн күндөрү жана калган суммасы тууралуу толук көчүрмө
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendWhatsAppStatement(d)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsAppка жөнөтүү</span>
                    </button>
                    <button
                      onClick={handlePrintStatement}
                      className="px-3 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Басып чыгаруу</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDebtorForDetails(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Жабуу
                </button>

                {d.balance > 0 && (
                  <button
                    onClick={() => {
                      setPayModalDebtor(d);
                      setPayAmount(d.balance.toString());
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Карызды төлөө ({d.balance.toLocaleString()} {settings.currency})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pay Debt Modal */}
      {payModalDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200">
            <h4 className="text-base font-bold text-neutral-900 mb-1">Карызды төлөө</h4>
            <p className="text-xs text-neutral-500 mb-3">
              Кардар: <span className="font-bold text-neutral-800">{payModalDebtor.name}</span>
            </p>

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div className="p-3 bg-neutral-50 rounded-lg text-xs flex justify-between">
                <span>Учурдагы карыз:</span>
                <span className="font-bold text-amber-800">
                  {payModalDebtor.balance.toLocaleString()} {settings.currency}
                </span>
              </div>

              {payModalDebtor.dueDate && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] flex items-center justify-between border border-emerald-200">
                  <span>Төлөө мөөнөтү:</span>
                  <span className="font-bold">{payModalDebtor.dueDate}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Төлөнүүчү сумма ({settings.currency}):
                </label>
                <input
                  type="number"
                  step="any"
                  max={payModalDebtor.balance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Төлөм түрү:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`py-1.5 rounded-lg border font-medium ${
                      payMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    Накталай
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`py-1.5 rounded-lg border font-medium ${
                      payMethod === 'card'
                        ? 'bg-blue-50 border-blue-600 text-blue-800 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    Карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('qr')}
                    className={`py-1.5 rounded-lg border font-medium ${
                      payMethod === 'qr'
                        ? 'bg-purple-50 border-purple-600 text-purple-800 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    MBank/QR
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Эскертүү:
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Мис: Айлыгынан берди..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalDebtor(null)}
                  className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Төлөмдү кабыл алуу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manual Debt Modal */}
      {addDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200">
            <h4 className="text-base font-bold text-neutral-900 mb-1">Карыз дептерине жазуу</h4>
            <p className="text-xs text-neutral-500 mb-3">
              Кардарга товарды же сумманы карызга жазып коюу
            </p>

            <form onSubmit={handleAddManualDebtSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Кардардын аты *
                </label>
                <input
                  type="text"
                  required
                  value={newDebtName}
                  onChange={(e) => setNewDebtName(e.target.value)}
                  placeholder="Мис: Азамат байке"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Телефон номери:
                </label>
                <input
                  type="text"
                  value={newDebtPhone}
                  onChange={(e) => setNewDebtPhone(e.target.value)}
                  placeholder="+996 (---) -- -- --"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Карыз суммасы ({settings.currency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={newDebtAmount}
                  onChange={(e) => setNewDebtAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Эмне алды / Себеби:
                </label>
                <input
                  type="text"
                  value={newDebtNotes}
                  onChange={(e) => setNewDebtNotes(e.target.value)}
                  placeholder="Мис: Ун 1 кап, май 2 литр..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                  <span>Карызды кайтаруу мөөнөтү (дедлайн):</span>
                  <span className="text-[10px] text-neutral-400">Милдеттүү эмес</span>
                </label>
                <input
                  type="date"
                  value={newDebtDueDate}
                  onChange={(e) => setNewDebtDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddDebtModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Карызды жазуу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { PaymentMethod, Debtor, Customer } from '../types';
import {
  Banknote,
  CreditCard,
  QrCode,
  BookOpen,
  X,
  Check,
  AlertCircle,
  User,
  Calendar,
  Phone,
  MessageCircle,
  Clock,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface PaymentModalProps {
  total: number;
  currency: string;
  debtors: Debtor[];
  customers?: Customer[];
  initialMethod?: PaymentMethod;
  initialSplitDebt?: boolean;
  onConfirm: (data: {
    paymentMethod: PaymentMethod;
    cashReceived?: number;
    cashChange?: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    paidNowAmount?: number;
    paidNowMethod?: 'cash' | 'card' | 'qr';
    debtAmount?: number;
    debtDueDate?: string;
    splitPayment?: {
      cashAmount?: number;
      qrAmount?: number;
      cardAmount?: number;
    };
  }) => void;
  onClose: () => void;
}

// Helper to format date YYYY-MM-DD
const formatDatePlusDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  total,
  currency,
  debtors,
  customers = [],
  initialMethod = 'qr',
  initialSplitDebt = false,
  onConfirm,
  onClose,
}) => {
  // Main selected payment method
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);

  // Toggle for partial debt / split into debt + paid
  const [isPartialDebt, setIsPartialDebt] = useState<boolean>(
    initialSplitDebt || initialMethod === 'debt' || initialMethod === 'partial_debt'
  );

  // Toggle for Cash + QR split (without debt)
  const [isSplitCashQr, setIsSplitCashQr] = useState<boolean>(false);

  // Cash received for pure cash payment
  const [cashReceived, setCashReceived] = useState<string>(total.toString());

  // Split cash amount
  const [splitCashInput, setSplitCashInput] = useState<string>(Math.round(total / 2).toString());

  // Customer information (Name & WhatsApp Phone)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Partial debt inputs:
  // Debt amount taken by customer
  const defaultHalf = Math.round(total / 2);
  const [debtInput, setDebtInput] = useState<string>(
    initialSplitDebt ? defaultHalf.toString() : initialMethod === 'debt' ? total.toString() : '0'
  );
  // How the remaining portion is paid today (defaults to QR / MBank!)
  const [paidNowMethod, setPaidNowMethod] = useState<'qr' | 'cash' | 'card'>('qr');
  const [dueDate, setDueDate] = useState<string>(() => formatDatePlusDays(30));

  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Synchronize initialMethod if it changes
  useEffect(() => {
    if (initialSplitDebt) {
      setIsPartialDebt(true);
      setDebtInput(defaultHalf.toString());
      setPaidNowMethod('qr');
    }
  }, [initialSplitDebt, defaultHalf]);

  // Combine unique customer names for quick autocomplete
  const knownCustomerList = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; balance?: number }>();

    customers.forEach((c) => {
      map.set(c.name.trim().toLowerCase(), {
        name: c.name.trim(),
        phone: c.phone || '',
      });
    });

    debtors.forEach((d) => {
      const key = d.name.trim().toLowerCase();
      const existing = map.get(key);
      map.set(key, {
        name: d.name.trim(),
        phone: d.phone || existing?.phone || '',
        balance: d.balance,
      });
    });

    return Array.from(map.values());
  }, [customers, debtors]);

  // Selected customer's existing debt if any
  const matchedDebtor = useMemo(() => {
    if (!customerName.trim()) return null;
    return debtors.find(
      (d) => d.name.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
  }, [customerName, debtors]);

  // Calculations for pure Cash mode
  const receivedNum = parseFloat(cashReceived) || 0;
  const changeAmount = Math.max(0, receivedNum - total);
  const isCashInsufficient = method === 'cash' && !isPartialDebt && !isSplitCashQr && receivedNum < total;
  const cashShortage = Math.max(0, total - receivedNum);

  // Calculations for Partial Debt mode
  const parsedDebt = Math.min(total, Math.max(0, parseFloat(debtInput) || 0));
  const parsedPaidNow = Math.max(0, total - parsedDebt);

  // Calculations for Split Cash + QR
  const parsedSplitCash = Math.min(total, Math.max(0, parseFloat(splitCashInput) || 0));
  const parsedSplitQr = Math.max(0, total - parsedSplitCash);

  // Quick bills for Cash payment in KG
  const quickBills = [
    total,
    Math.ceil(total / 100) * 100,
    500,
    1000,
    2000,
    5000,
  ].filter((v, idx, arr) => v >= total && arr.indexOf(v) === idx);

  // Select customer from dropdown list
  const handleSelectCustomer = (selected: { name: string; phone: string }) => {
    setCustomerName(selected.name);
    if (selected.phone) {
      setCustomerPhone(selected.phone);
    }
    setError('');
  };

  // Change debt amount and auto-update
  const handleSetDebtAmount = (val: number) => {
    const clamped = Math.min(total, Math.max(0, val));
    setDebtInput(clamped.toString());
    setError('');
  };

  // Change paid now amount and auto-update debt
  const handleSetPaidNowAmount = (val: number) => {
    const clamped = Math.min(total, Math.max(0, val));
    const newDebt = Math.max(0, total - clamped);
    setDebtInput(newDebt.toString());
    setError('');
  };

  // Quick action: activate partial debt from cash shortage
  const handleConvertShortageToDebt = () => {
    setIsPartialDebt(true);
    setIsSplitCashQr(false);
    setPaidNowMethod('cash');
    setDebtInput(cashShortage.toString());
  };

  // Quick action: activate MBank QR split from cash shortage
  const handleConvertShortageToQr = () => {
    setIsSplitCashQr(true);
    setIsPartialDebt(false);
    setSplitCashInput(receivedNum.toString());
  };

  // Confirm Sale Submission
  const handleConfirm = () => {
    setError('');
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();

    // 1. Partial Debt or Pure Debt Mode
    if (isPartialDebt || method === 'debt' || method === 'partial_debt') {
      if (!trimmedName) {
        setError('Карыз жазуу үчүн кардардын аты-жөнүн сөзсүз киргизиңиз!');
        return;
      }
      if (parsedDebt <= 0) {
        setError('Карызга калган сумма 0дөн чоң болушу керек. Эгер толук төлөсө, толук төлөмдү тандаңыз.');
        return;
      }

      onConfirm({
        paymentMethod: parsedPaidNow > 0 ? 'partial_debt' : 'debt',
        customerName: trimmedName,
        customerPhone: trimmedPhone || undefined,
        paidNowAmount: parsedPaidNow,
        paidNowMethod: parsedPaidNow > 0 ? paidNowMethod : undefined,
        debtAmount: parsedDebt,
        debtDueDate: dueDate,
        notes: notes.trim() || undefined,
      });
      return;
    }

    // 2. Split Cash + QR Mode
    if (isSplitCashQr) {
      if (parsedSplitCash <= 0 && parsedSplitQr <= 0) {
        setError('Төлөм суммасы туура эмес!');
        return;
      }
      onConfirm({
        paymentMethod: 'split',
        customerName: trimmedName || undefined,
        customerPhone: trimmedPhone || undefined,
        splitPayment: {
          cashAmount: parsedSplitCash,
          qrAmount: parsedSplitQr,
        },
        notes: notes.trim() || undefined,
      });
      return;
    }

    // 3. Pure Cash Mode
    if (method === 'cash') {
      if (receivedNum < total) {
        setError('Алынган накталай акча жалпы суммадан аз! Калган сумманы карызга жазыңыз же Мбанк QR менен кабыл алыңыз.');
        return;
      }
      onConfirm({
        paymentMethod: 'cash',
        cashReceived: receivedNum,
        cashChange: changeAmount,
        customerName: trimmedName || undefined,
        customerPhone: trimmedPhone || undefined,
        notes: notes.trim() || undefined,
      });
      return;
    }

    // 4. Pure Card or QR Mode
    if (method === 'card' || method === 'qr') {
      onConfirm({
        paymentMethod: method,
        customerName: trimmedName || undefined,
        customerPhone: trimmedPhone || undefined,
        notes: notes.trim() || undefined,
      });
    }
  };

  return (
    <div
      id="payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="payment-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden my-auto border border-neutral-200 max-h-[96vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900 text-white shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>Төлөм кабыл алуу & Чек жазуу</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Накталай, Мбанк QR же Карызга жарым-жартылай бөлүп алуу
            </p>
          </div>
          <button
            id="close-payment-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1 text-sm">
          {/* Total Amount Box */}
          <div className="p-3.5 rounded-xl bg-neutral-950 text-white flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Жалпы төлөө суммасы:
              </span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Касса чеги чыгарууга даяр
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {total.toLocaleString()}
              </span>{' '}
              <span className="text-sm font-bold text-emerald-400">{currency}</span>
            </div>
          </div>

          {/* QUICK MODE SWITCHER: Full Payment vs Partial Debt vs Split Cash+QR */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsPartialDebt(false);
                setIsSplitCashQr(false);
                if (method === 'debt' || method === 'partial_debt') setMethod('qr');
                setError('');
              }}
              className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
                !isPartialDebt && !isSplitCashQr
                  ? 'bg-white text-neutral-900 shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Толук төлөм</span>
            </button>

            <button
              type="button"
              id="partial-debt-mode-tab"
              onClick={() => {
                setIsPartialDebt(true);
                setIsSplitCashQr(false);
                if (parsedDebt === 0) setDebtInput(defaultHalf.toString());
                setError('');
              }}
              className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
                isPartialDebt
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>⚡ Карыз + Төлөм</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSplitCashQr(true);
                setIsPartialDebt(false);
                setError('');
              }}
              className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
                isSplitCashQr
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Накталай + QR</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SECTION A: PARTIAL DEBT / SPLIT INTO DEBT + PAID NOW                      */}
          {/* ========================================================================= */}
          {isPartialDebt && (
            <div className="space-y-3.5 bg-amber-50/90 p-4 rounded-xl border-2 border-amber-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-amber-700" />
                  <span>Карызга алуу & Калганын кабыл алуу</span>
                </div>
                <span className="text-[11px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Карыздар дептерине автоматтык жазылат
                </span>
              </div>

              {/* Two Column Synchronized Cards: 1) Debt Amount, 2) Paid Now */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Debt Amount (Карызга алынган сумма) */}
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900">
                      1. Карызга алынган сумма:
                    </label>
                    <span className="text-[11px] font-bold text-amber-700">
                      {total > 0 ? `${Math.round((parsedDebt / total) * 100)}%` : '0%'}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="partial-debt-amount-input"
                      type="number"
                      min="0"
                      max={total}
                      value={debtInput}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleSetDebtAmount(val);
                      }}
                      className="w-full text-xl font-black px-3 py-2 rounded-lg border-2 border-amber-400 focus:ring-2 focus:ring-amber-500 bg-white text-amber-950"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-neutral-400">
                      {currency}
                    </span>
                  </div>

                  {/* Quick percentage chips for Debt */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetDebtAmount(Math.round(total * 0.2))}
                      className="px-2 py-0.5 text-[11px] rounded font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200"
                    >
                      20%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDebtAmount(Math.round(total * 0.3))}
                      className="px-2 py-0.5 text-[11px] rounded font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200"
                    >
                      30%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDebtAmount(Math.round(total * 0.5))}
                      className="px-2 py-0.5 text-[11px] rounded font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                    >
                      50% (Жарымы)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDebtAmount(Math.round(total * 0.7))}
                      className="px-2 py-0.5 text-[11px] rounded font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200"
                    >
                      70%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDebtAmount(total)}
                      className="px-2 py-0.5 text-[11px] rounded font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200"
                    >
                      100% (Толук)
                    </button>
                  </div>
                </div>

                {/* 2. Paid Now Amount & Method (Калган сумманы төлөө) */}
                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900">
                      2. Калган сумма (Азыр төлөнөт):
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {total > 0 ? `${Math.round((parsedPaidNow / total) * 100)}%` : '0%'}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="partial-paid-now-input"
                      type="number"
                      min="0"
                      max={total}
                      value={parsedPaidNow}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleSetPaidNowAmount(val);
                      }}
                      className="w-full text-xl font-black px-3 py-2 rounded-lg border-2 border-emerald-400 focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-950"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-neutral-400">
                      {currency}
                    </span>
                  </div>

                  {/* Payment method for the remaining paid amount */}
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-500 block mb-1">
                      Калган сумма кайсы ыкма менен кабыл алынды?
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        id="paid-now-qr-btn"
                        onClick={() => setPaidNowMethod('qr')}
                        className={`py-1 px-1.5 text-[11px] rounded-lg font-bold flex items-center justify-center gap-1 border transition ${
                          paidNowMethod === 'qr'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Мбанк QR</span>
                      </button>

                      <button
                        type="button"
                        id="paid-now-cash-btn"
                        onClick={() => setPaidNowMethod('cash')}
                        className={`py-1 px-1.5 text-[11px] rounded-lg font-bold flex items-center justify-center gap-1 border transition ${
                          paidNowMethod === 'cash'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Накталай</span>
                      </button>

                      <button
                        type="button"
                        id="paid-now-card-btn"
                        onClick={() => setPaidNowMethod('card')}
                        className={`py-1 px-1.5 text-[11px] rounded-lg font-bold flex items-center justify-center gap-1 border transition ${
                          paidNowMethod === 'card'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Карта</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Due date picker for the debt */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <span>Карызды кайтаруу / төлөп бүтүү мөөнөтү (Дедлайн):</span>
                  </label>
                  <span className="text-[11px] font-semibold text-amber-800">
                    {dueDate}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="partial-debt-due-date-input"
                    type="date"
                    value={dueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-neutral-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setDueDate(formatDatePlusDays(7))}
                      className="px-2 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded border border-neutral-300"
                    >
                      +7 күн
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(formatDatePlusDays(15))}
                      className="px-2 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded border border-neutral-300"
                    >
                      +15 күн
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(formatDatePlusDays(30))}
                      className="px-2 py-1 text-[11px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded border border-amber-300"
                    >
                      +30 күн (1 ай)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(formatDatePlusDays(60))}
                      className="px-2 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded border border-neutral-300"
                    >
                      +60 күн
                    </button>
                  </div>
                </div>
              </div>

              {/* Status summary banner */}
              <div className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-300 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-950">Сатуунун жыйынтыгы:</span>
                  <p className="text-[11px] text-amber-800">
                    Бүгүн кассага:{' '}
                    <span className="font-bold text-emerald-800">
                      {parsedPaidNow.toLocaleString()} {currency} (
                      {paidNowMethod === 'qr' ? 'Мбанк QR' : paidNowMethod === 'card' ? 'Карта' : 'Накталай'})
                    </span>{' '}
                    | Дептерге карыз:{' '}
                    <span className="font-bold text-amber-950">
                      {parsedDebt.toLocaleString()} {currency}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION B: SPLIT CASH + QR (WITHOUT DEBT)                                 */}
          {/* ========================================================================= */}
          {isSplitCashQr && !isPartialDebt && (
            <div className="space-y-3.5 bg-purple-50/90 p-4 rounded-xl border-2 border-purple-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-950 font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-purple-700" />
                  <span>Аралаш төлөм (Накталай + Мбанк QR)</span>
                </div>
                <span className="text-[11px] bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                  Карыз жок, толук төлөнөт
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Cash portion */}
                <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-xs space-y-1.5">
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Накталай төлөнгөнү:</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={total}
                      value={splitCashInput}
                      onChange={(e) => setSplitCashInput(e.target.value)}
                      className="w-full text-lg font-bold px-3 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-purple-500 bg-white"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-neutral-400">
                      {currency}
                    </span>
                  </div>
                </div>

                {/* 2. QR portion */}
                <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-xs space-y-1.5">
                  <label className="text-xs font-bold text-purple-900 flex items-center gap-1">
                    <QrCode className="w-4 h-4 text-purple-600" />
                    <span>Мбанк QR менен төлөнгөнү:</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      readOnly
                      value={parsedSplitQr}
                      className="w-full text-lg font-black px-3 py-2 rounded-lg border border-purple-300 bg-purple-50/50 text-purple-950"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-purple-600">
                      {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION C: REGULAR FULL PAYMENT METHODS                                  */}
          {/* ========================================================================= */}
          {!isPartialDebt && !isSplitCashQr && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Төлөм ыкмасын тандаңыз:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. MBank / QR */}
                <button
                  id="pay-method-qr-btn"
                  type="button"
                  onClick={() => {
                    setMethod('qr');
                    setError('');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    method === 'qr'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-2 ring-purple-500/30'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <QrCode className="w-5 h-5 mb-1 text-purple-600" />
                  <span className="text-xs">MBank / QR</span>
                </button>

                {/* 2. Cash */}
                <button
                  id="pay-method-cash-btn"
                  type="button"
                  onClick={() => {
                    setMethod('cash');
                    setError('');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    method === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/30'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <Banknote className="w-5 h-5 mb-1 text-emerald-600" />
                  <span className="text-xs">Накталай</span>
                </button>

                {/* 3. Card */}
                <button
                  id="pay-method-card-btn"
                  type="button"
                  onClick={() => {
                    setMethod('card');
                    setError('');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    method === 'card'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500/30'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mb-1 text-blue-600" />
                  <span className="text-xs">Банк картасы</span>
                </button>

                {/* 4. Debt */}
                <button
                  id="pay-method-debt-btn"
                  type="button"
                  onClick={() => {
                    setIsPartialDebt(true);
                    setDebtInput(total.toString());
                    setError('');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700`}
                >
                  <BookOpen className="w-5 h-5 mb-1 text-amber-600" />
                  <span className="text-xs">Карыз / Насия</span>
                </button>
              </div>

              {/* Conditional Panels for Pure Methods */}
              {method === 'qr' && (
                <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-purple-950 text-sm">
                        MBank, Optima же башка Банк QR коду аркылуу төлөм
                      </h4>
                      <p className="text-xs text-purple-700">
                        Кардардын телефонундагы төлөм чегин текшериңиз
                      </p>
                    </div>
                  </div>

                  {/* 1-click partial debt button inside MBank QR tab */}
                  <div className="pt-2 border-t border-purple-200/80 flex items-center justify-between">
                    <span className="text-xs text-purple-900 font-medium">
                      Кардар жарым-жартылай карызга калтырып жатабы?
                    </span>
                    <button
                      type="button"
                      id="quick-split-from-qr-btn"
                      onClick={() => {
                        setIsPartialDebt(true);
                        setPaidNowMethod('qr');
                        setDebtInput(defaultHalf.toString());
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Карыз суммасын бөлүү</span>
                    </button>
                  </div>
                </div>
              )}

              {method === 'cash' && (
                <div className="space-y-3.5 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1">
                      Кардардан алынган накталай акча ({currency}):
                    </label>
                    <div className="relative">
                      <input
                        id="cash-received-input"
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-full text-xl font-bold px-3 py-2 rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                        placeholder="0"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setCashReceived(total.toString())}
                        className="absolute right-2 top-2 px-2 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md transition"
                      >
                        Так сумма
                      </button>
                    </div>
                  </div>

                  {/* Quick bill buttons */}
                  <div>
                    <span className="text-[11px] text-neutral-500 font-medium">Тез тандоо купюралары:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {quickBills.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setCashReceived(b.toString())}
                          className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50 text-neutral-800 text-xs font-semibold transition"
                        >
                          {b.toLocaleString()} {currency}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change calculation or Smart Shortage Helper */}
                  {receivedNum >= total ? (
                    <div className="pt-2 border-t border-emerald-200 flex justify-between items-center">
                      <span className="text-xs font-semibold text-neutral-700">
                        Кайтарым акча (Сдача):
                      </span>
                      <span className="text-xl font-black text-emerald-700">
                        {changeAmount.toLocaleString()} {currency}
                      </span>
                    </div>
                  ) : (
                    /* SMART SHORTAGE HELPER: Avoids frustrating blocking error! */
                    <div className="pt-2 border-t border-amber-300 space-y-2">
                      <div className="p-2.5 rounded-lg bg-amber-100/90 border border-amber-300">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-950 mb-1">
                          <span>Накталай акча жетишсиз:</span>
                          <span className="text-amber-900 font-black">
                            {cashShortage.toLocaleString()} {currency} калды
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 mb-2">
                          Калган {cashShortage.toLocaleString()} {currency} кандай кабыл алынат?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleConvertShortageToQr}
                            className="py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Мбанк QR менен төлөндү</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleConvertShortageToDebt}
                            className="py-1.5 px-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Карыз дептерине жазуу</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {method === 'card' && (
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-950 text-sm">
                        Банк картасы менен POS-терминал аркылуу төлөө
                      </h4>
                      <p className="text-xs text-blue-700">
                        Карта тийгизилген соң чекти бекитиңиз
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between">
                    <span className="text-xs text-blue-900 font-medium">
                      Кардар бир бөлүгүн карызга калтырып жатабы?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPartialDebt(true);
                        setPaidNowMethod('card');
                        setDebtInput(defaultHalf.toString());
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Карыз суммасын бөлүү</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION D: CUSTOMER DETAILS (Аты-жөнү жана Ватсап номери)                 */}
          {/* ========================================================================= */}
          <div
            className={`p-4 rounded-xl border transition space-y-3 ${
              isPartialDebt
                ? 'bg-amber-50/60 border-2 border-amber-400 ring-2 ring-amber-400/20'
                : 'bg-neutral-50/80 border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-neutral-800">
                <User className="w-4 h-4 text-emerald-600" />
                <span>
                  Кардардын маалыматы {isPartialDebt && <span className="text-amber-700">(Карыз үчүн милдеттүү)</span>}
                </span>
              </div>
              {matchedDebtor && matchedDebtor.balance > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Мурдагы карызы: {matchedDebtor.balance.toLocaleString()} {currency}
                </span>
              )}
            </div>

            {/* Quick customer selection dropdown if we have existing clients */}
            {knownCustomerList.length > 0 && !customerName && (
              <div className="relative">
                <select
                  aria-label="Кардарлардын тизмесинен тандоо"
                  onChange={(e) => {
                    const c = knownCustomerList.find((it) => it.name === e.target.value);
                    if (c) handleSelectCustomer(c);
                  }}
                  defaultValue=""
                  className="w-full text-xs py-2 px-3 bg-white border border-neutral-300 rounded-lg text-neutral-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="" disabled>
                    -- Базадагы кардарлардан тез тандоо ({knownCustomerList.length} кардар) --
                  </option>
                  {knownCustomerList.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} {c.balance ? `[Карызы: ${c.balance} ${currency}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Кардардын аты-жөнү: {isPartialDebt && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setError('');
                  }}
                  placeholder="Мисалы: Алмаз Беков"
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white font-medium focus:ring-2 focus:outline-hidden ${
                    isPartialDebt && !customerName.trim()
                      ? 'border-amber-400 focus:ring-amber-500'
                      : 'border-neutral-300 focus:ring-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 inline" />
                    <span>Ватсап номери:</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-normal">чек/эскертүү үчүн</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                  <input
                    id="customer-phone-input"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+996 700 12-34-56"
                    className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-neutral-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Чекке кошумча эскертүү (ыктыярдуу):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Мисалы: Мбанк QR аркылуу төлөндү, калганы 1 айга карыз ж.б."
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-semibold hover:bg-neutral-100 transition text-xs sm:text-sm"
          >
            Жокко чыгаруу
          </button>

          <button
            id="confirm-checkout-btn"
            type="button"
            disabled={isCashInsufficient}
            onClick={handleConfirm}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm transition shadow-sm ${
              isCashInsufficient
                ? 'bg-neutral-400 cursor-not-allowed'
                : isPartialDebt
                ? 'bg-amber-600 hover:bg-amber-700 active:scale-98'
                : isSplitCashQr
                ? 'bg-purple-600 hover:bg-purple-700 active:scale-98'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
            }`}
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>
              {isPartialDebt
                ? `Карыз (${parsedDebt.toLocaleString()} ${currency}) + ${
                    paidNowMethod === 'qr' ? 'Мбанк QR' : paidNowMethod === 'card' ? 'Карта' : 'Накталай'
                  } (${parsedPaidNow.toLocaleString()} ${currency}) бекитүү`
                : isSplitCashQr
                ? `Аралаш төлөм (Накталай + QR) бекитүү`
                : method === 'qr'
                ? `Мбанк QR аркылуу төлөндү (${total.toLocaleString()} ${currency})`
                : `Төлөмдү бекитүү жана чек чыгаруу`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

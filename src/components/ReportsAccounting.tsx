import React, { useState, useMemo } from 'react';
import { Sale, ShopSettings, Expense, Debtor, DebtPayment } from '../types';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  BookOpen,
  Calendar,
  Receipt,
  RotateCcw,
  Eye,
  Award,
  BarChart3,
  DollarSign,
  Percent,
  Download,
  Printer,
  CalendarDays,
  Layers,
  ChevronRight,
  ShoppingBag,
  SlidersHorizontal,
  PieChart,
  ArrowUpRight,
  Calculator,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Tag,
  MessageCircle,
  Wallet,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react';
import { sendReceiptViaWhatsApp } from '../utils/whatsappReceipt';

interface ReportsAccountingProps {
  sales: Sale[];
  settings: ShopSettings;
  expenses?: Expense[];
  debtors?: Debtor[];
  onViewReceipt: (sale: Sale) => void;
  onRefundSale: (saleId: string, reason: string) => void;
  onOpenExpensesTab?: () => void;
  onOpenDebtsTab?: () => void;
}

export type SummaryViewMode =
  | 'overview'
  | 'markup-analysis'
  | 'financial-statement'
  | 'by-day'
  | 'by-week'
  | 'by-month';

export const ReportsAccounting: React.FC<ReportsAccountingProps> = ({
  sales,
  settings,
  expenses = [],
  debtors = [],
  onViewReceipt,
  onRefundSale,
  onOpenExpensesTab,
  onOpenDebtsTab,
}) => {
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | 'month' | 'all'>('7days');
  const [viewMode, setViewMode] = useState<SummaryViewMode>('overview');
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Кардар кайтарып берди');

  // Filters for Markup Analysis tab
  const [markupSearchTerm, setMarkupSearchTerm] = useState('');
  const [markupSortBy, setMarkupSortBy] = useState<
    'profit-desc' | 'markup-desc' | 'revenue-desc' | 'percent-desc' | 'qty-desc'
  >('profit-desc');

  // Filter sales by selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 86400000 * 6;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter((s) => {
      if (period === 'today') return s.timestamp >= startOfToday;
      if (period === 'yesterday')
        return s.timestamp >= startOfYesterday && s.timestamp < startOfToday;
      if (period === '7days') return s.timestamp >= startOf7Days;
      if (period === 'month') return s.timestamp >= startOfMonth;
      return true; // all
    });
  }, [sales, period]);

  // Filter expenses by selected period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 86400000 * 6;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return expenses.filter((e) => {
      const expTime = new Date(e.date).getTime() + 43200000;
      if (period === 'today') return expTime >= startOfToday;
      if (period === 'yesterday') return expTime >= startOfYesterday && expTime < startOfToday;
      if (period === '7days') return expTime >= startOf7Days;
      if (period === 'month') return expTime >= startOfMonth;
      return true;
    });
  }, [expenses, period]);

  const totalPeriodExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  // Valid non-refunded sales for metrics
  const activeSales = useMemo(() => {
    return filteredSales.filter((s) => s.status === 'completed');
  }, [filteredSales]);

  const refundedSales = useMemo(() => {
    return filteredSales.filter((s) => s.status === 'refunded');
  }, [filteredSales]);

  // Financial aggregates for active sales in chosen period
  const totalRevenue = useMemo(() => {
    return activeSales.reduce((acc, s) => acc + s.total, 0);
  }, [activeSales]);

  const totalCost = useMemo(() => {
    return activeSales.reduce((acc, s) => acc + s.costTotal, 0);
  }, [activeSales]);

  // Total Markup amount (Үстөк коюлган кошумча баа)
  const totalMarkup = totalRevenue - totalCost;

  // Realized markup % on wholesale cost
  const averageMarkupPercent =
    totalCost > 0 ? Number(((totalMarkup / totalCost) * 100).toFixed(1)) : 0;

  // Gross profit from sales (Дүң пайда)
  const netProfit = totalRevenue - totalCost;

  // Profit Margin % (Маржа / Рентабелдүүлүк)
  const marginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // True Net Profit (Чыгымдар эсептелген Нетто пайда)
  const trueNetProfit = netProfit - totalPeriodExpenses;
  const trueNetMargin = totalRevenue > 0 ? Math.round((trueNetProfit / totalRevenue) * 100) : 0;

  const totalDiscounts = useMemo(() => {
    return activeSales.reduce((acc, s) => {
      // Sum overall discount and any line-item discounts
      const itemDiscountsSum = s.items.reduce((iAcc, item) => iAcc + (item.discountAmount || 0), 0);
      return acc + (s.discountAmount || 0) + itemDiscountsSum;
    }, 0);
  }, [activeSales]);

  const totalCatalogPrice = totalRevenue + totalDiscounts;

  const checkCount = activeSales.length;
  const averageCheck = checkCount > 0 ? Math.round(totalRevenue / checkCount) : 0;

  // Breakdown by payment method from sales
  const paymentBreakdown = useMemo(() => {
    const breakdown = {
      cash: 0,
      card: 0,
      qr: 0,
      debt: 0,
    };
    activeSales.forEach((s) => {
      if (s.paymentMethod === 'cash') {
        breakdown.cash += s.total;
      } else if (s.paymentMethod === 'card') {
        breakdown.card += s.total;
      } else if (s.paymentMethod === 'qr') {
        breakdown.qr += s.total;
      } else if (s.paymentMethod === 'debt') {
        breakdown.debt += s.total;
      } else if (s.paymentMethod === 'partial_debt') {
        const debtPart =
          s.debtAmount !== undefined ? s.debtAmount : s.total - (s.paidNowAmount || 0);
        breakdown.debt += debtPart;
        const paidNow = s.paidNowAmount || 0;
        if (s.paidNowMethod === 'card') {
          breakdown.card += paidNow;
        } else if (s.paidNowMethod === 'qr') {
          breakdown.qr += paidNow;
        } else {
          breakdown.cash += paidNow;
        }
      } else if (s.paymentMethod === 'split') {
        if (s.splitPayment) {
          breakdown.cash += s.splitPayment.cashAmount || 0;
          breakdown.qr += s.splitPayment.qrAmount || 0;
          breakdown.card += s.splitPayment.cardAmount || 0;
        } else {
          breakdown.qr += s.total;
        }
      }
    });
    return breakdown;
  }, [activeSales]);

  // ==================== DEBT PAYMENTS COLLECTED IN PERIOD ====================
  // Төлөнгөн карыздарды эсепке алуу (мөөнөтүнөн эрте же убагында төлөнгөндөр)
  const filteredDebtPayments = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 86400000 * 6;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const list: Array<{
      debtorId: string;
      debtorName: string;
      debtorPhone: string;
      payment: DebtPayment;
      dueDate?: string;
      isEarly: boolean;
      daysEarly: number;
    }> = [];

    debtors.forEach((d) => {
      d.payments.forEach((p) => {
        let inPeriod = false;
        if (period === 'today') inPeriod = p.timestamp >= startOfToday;
        else if (period === 'yesterday')
          inPeriod = p.timestamp >= startOfYesterday && p.timestamp < startOfToday;
        else if (period === '7days') inPeriod = p.timestamp >= startOf7Days;
        else if (period === 'month') inPeriod = p.timestamp >= startOfMonth;
        else inPeriod = true; // all

        if (inPeriod) {
          const dueStr = p.dueDateAtPayment || d.dueDate;
          let isEarly = Boolean(p.paidEarly);
          let daysEarly = p.daysEarly || 0;

          if (!isEarly && dueStr) {
            const dueTime = new Date(`${dueStr}T23:59:59`).getTime();
            if (p.timestamp < dueTime) {
              daysEarly = Math.ceil((dueTime - p.timestamp) / 86400000);
              isEarly = daysEarly >= 1;
            }
          }

          list.push({
            debtorId: d.id,
            debtorName: d.name,
            debtorPhone: d.phone,
            payment: p,
            dueDate: dueStr,
            isEarly,
            daysEarly,
          });
        }
      });
    });

    // Sort by latest payment
    return list.sort((a, b) => b.payment.timestamp - a.payment.timestamp);
  }, [debtors, period]);

  // Жалпы карыздан түшкөн сумма (колдонуучу сураган мезгилдеги)
  const totalDebtCollected = useMemo(() => {
    return filteredDebtPayments.reduce((sum, item) => sum + item.payment.amount, 0);
  }, [filteredDebtPayments]);

  // Сатылган жалпы суммага карыз төлөмдөрү кошулган чогуу сумма
  const totalRevenueWithDebts = totalRevenue + totalDebtCollected;

  // Карыздан түшкөн акчалардын төлөм ыкмасы (Накталай, Карта, QR)
  const debtPaymentBreakdown = useMemo(() => {
    const brk = { cash: 0, card: 0, qr: 0 };
    filteredDebtPayments.forEach((item) => {
      const m = item.payment.paymentMethod;
      if (m === 'card') brk.card += item.payment.amount;
      else if (m === 'qr') brk.qr += item.payment.amount;
      else brk.cash += item.payment.amount;
    });
    return brk;
  }, [filteredDebtPayments]);

  // Бириккен кассалык түшүм (Сатуулардагы төлөмдөр + Карыздан түшкөндөр)
  const combinedCashInflow = {
    cash: paymentBreakdown.cash + debtPaymentBreakdown.cash,
    card: paymentBreakdown.card + debtPaymentBreakdown.card,
    qr: paymentBreakdown.qr + debtPaymentBreakdown.qr,
    total: paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.qr + totalDebtCollected,
  };

  // Best-selling items ranking
  const bestSellingItems = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        quantity: number;
        unit: string;
        totalRevenue: number;
        totalCost: number;
        markup: number;
        markupPercent: number;
        profit: number;
      }
    >();

    activeSales.forEach((s) => {
      s.items.forEach((item) => {
        const prev = map.get(item.productId) || {
          name: item.name,
          quantity: 0,
          unit: item.unit,
          totalRevenue: 0,
          totalCost: 0,
          markup: 0,
          markupPercent: 0,
          profit: 0,
        };
        const itemCost = (item.costPrice || 0) * item.quantity;
        const itemProfit = item.total - itemCost;
        const newCost = prev.totalCost + itemCost;
        const newRevenue = prev.totalRevenue + item.total;
        const newProfit = prev.profit + itemProfit;
        const newMarkup = newRevenue - newCost;
        const newMarkupPercent =
          newCost > 0 ? Number(((newMarkup / newCost) * 100).toFixed(1)) : 0;

        map.set(item.productId, {
          name: item.name,
          quantity: prev.quantity + item.quantity,
          unit: item.unit,
          totalRevenue: newRevenue,
          totalCost: newCost,
          markup: newMarkup,
          markupPercent: newMarkupPercent,
          profit: newProfit,
        });
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
  }, [activeSales]);

  // ==================== DETAILED PRODUCT-BY-PRODUCT MARKUP ANALYSIS ====================
  const productMarkupAnalysis = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        barcode: string;
        category: string;
        unit: string;
        costPrice: number;
        salePrice: number;
        configuredMarkupPercent: number;
        quantitySold: number;
        totalCost: number;
        totalRevenue: number;
        totalMarkup: number;
        netProfit: number;
        realizedMarkupPercent: number;
      }
    >();

    activeSales.forEach((s) => {
      s.items.forEach((item) => {
        const itemCost = (item.costPrice || 0) * item.quantity;
        const itemProfit = item.total - itemCost;
        const itemMarkup = item.total - itemCost;

        const prev = map.get(item.productId) || {
          productId: item.productId,
          name: item.name,
          barcode: item.barcode,
          category: item.category || 'Техника',
          unit: item.unit,
          costPrice: item.costPrice || 0,
          salePrice: item.salePrice || 0,
          configuredMarkupPercent:
            item.markupPercent !== undefined
              ? item.markupPercent
              : item.costPrice > 0
              ? Number((((item.salePrice - item.costPrice) / item.costPrice) * 100).toFixed(1))
              : 0,
          quantitySold: 0,
          totalCost: 0,
          totalRevenue: 0,
          totalMarkup: 0,
          netProfit: 0,
          realizedMarkupPercent: 0,
        };

        const newQty = prev.quantitySold + item.quantity;
        const newTotalCost = prev.totalCost + itemCost;
        const newTotalRevenue = prev.totalRevenue + item.total;
        const newTotalMarkup = prev.totalMarkup + itemMarkup;
        const newNetProfit = prev.netProfit + itemProfit;
        const newRealizedMarkupPercent =
          newTotalCost > 0 ? Number(((newNetProfit / newTotalCost) * 100).toFixed(1)) : 0;

        map.set(item.productId, {
          ...prev,
          quantitySold: newQty,
          totalCost: newTotalCost,
          totalRevenue: newTotalRevenue,
          totalMarkup: newTotalMarkup,
          netProfit: newNetProfit,
          realizedMarkupPercent: newRealizedMarkupPercent,
        });
      });
    });

    let list = Array.from(map.values());

    if (markupSearchTerm.trim()) {
      const q = markupSearchTerm.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.barcode.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    if (markupSortBy === 'profit-desc') {
      list.sort((a, b) => b.netProfit - a.netProfit);
    } else if (markupSortBy === 'markup-desc') {
      list.sort((a, b) => b.totalMarkup - a.totalMarkup);
    } else if (markupSortBy === 'revenue-desc') {
      list.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (markupSortBy === 'percent-desc') {
      list.sort((a, b) => b.realizedMarkupPercent - a.realizedMarkupPercent);
    } else if (markupSortBy === 'qty-desc') {
      list.sort((a, b) => b.quantitySold - a.quantitySold);
    }

    return list;
  }, [activeSales, markupSearchTerm, markupSortBy]);

  // ==================== CATEGORY-BY-CATEGORY FINANCIAL BREAKDOWN ====================
  const categoryFinancials = useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        countSold: number;
        totalRevenue: number;
        totalCost: number;
        totalMarkup: number;
        netProfit: number;
        markupPercent: number;
        marginPercent: number;
      }
    >();

    activeSales.forEach((s) => {
      s.items.forEach((item) => {
        const cat = item.category || 'Ири тиричилик техникасы';
        const cost = (item.costPrice || 0) * item.quantity;
        const profit = item.total - cost;
        const markup = item.total - cost;

        const prev = map.get(cat) || {
          category: cat,
          countSold: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalMarkup: 0,
          netProfit: 0,
          markupPercent: 0,
          marginPercent: 0,
        };

        const newCost = prev.totalCost + cost;
        const newRev = prev.totalRevenue + item.total;
        const newMarkup = prev.totalMarkup + markup;
        const newProfit = prev.netProfit + profit;

        map.set(cat, {
          category: cat,
          countSold: prev.countSold + item.quantity,
          totalRevenue: newRev,
          totalCost: newCost,
          totalMarkup: newMarkup,
          netProfit: newProfit,
          markupPercent: newCost > 0 ? Number(((newMarkup / newCost) * 100).toFixed(1)) : 0,
          marginPercent: newRev > 0 ? Math.round((newProfit / newRev) * 100) : 0,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [activeSales]);

  // ==================== SUMMARIZING SALES BY DAY ====================
  const salesByDay = useMemo(() => {
    const dayGroups = new Map<
      string,
      {
        dateStr: string;
        timestamp: number;
        checksCount: number;
        revenue: number;
        cost: number;
        markup: number;
        markupPercent: number;
        profit: number;
        itemsSold: Map<string, { name: string; qty: number; unit: string; total: number }>;
      }
    >();

    sales
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        const d = new Date(s.timestamp);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;

        if (!dayGroups.has(dateKey)) {
          dayGroups.set(dateKey, {
            dateStr: d.toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
            timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
            checksCount: 0,
            revenue: 0,
            cost: 0,
            markup: 0,
            markupPercent: 0,
            profit: 0,
            itemsSold: new Map(),
          });
        }

        const group = dayGroups.get(dateKey)!;
        group.checksCount += 1;
        group.revenue += s.total;
        group.cost += s.costTotal;
        group.profit += s.profit;
        group.markup = group.revenue - group.cost;
        group.markupPercent =
          group.cost > 0 ? Number(((group.markup / group.cost) * 100).toFixed(1)) : 0;

        s.items.forEach((item) => {
          const itemPrev = group.itemsSold.get(item.productId) || {
            name: item.name,
            qty: 0,
            unit: item.unit,
            total: 0,
          };
          group.itemsSold.set(item.productId, {
            name: item.name,
            qty: itemPrev.qty + item.quantity,
            unit: item.unit,
            total: itemPrev.total + item.total,
          });
        });
      });

    return Array.from(dayGroups.values())
      .map((g) => {
        const topItem = Array.from(g.itemsSold.values()).sort((a, b) => b.total - a.total)[0];
        const margin = g.revenue > 0 ? Math.round((g.profit / g.revenue) * 100) : 0;
        return {
          ...g,
          margin,
          bestSeller: topItem,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [sales]);

  // ==================== SUMMARIZING SALES BY WEEK ====================
  const salesByWeek = useMemo(() => {
    const weekGroups = new Map<
      string,
      {
        weekLabel: string;
        weekStartTimestamp: number;
        checksCount: number;
        revenue: number;
        cost: number;
        markup: number;
        markupPercent: number;
        profit: number;
        itemsSold: Map<string, { name: string; qty: number; unit: string; total: number }>;
      }
    >();

    sales
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        const d = new Date(s.timestamp);
        const dayOfWeek = d.getDay();
        const diffToMonday = (dayOfWeek + 6) % 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const weekKey = `${monday.getFullYear()}-W${monday.toISOString().slice(5, 10)}`;
        const weekLabel = `${monday.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        })} — ${sunday.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`;

        if (!weekGroups.has(weekKey)) {
          weekGroups.set(weekKey, {
            weekLabel,
            weekStartTimestamp: monday.getTime(),
            checksCount: 0,
            revenue: 0,
            cost: 0,
            markup: 0,
            markupPercent: 0,
            profit: 0,
            itemsSold: new Map(),
          });
        }

        const group = weekGroups.get(weekKey)!;
        group.checksCount += 1;
        group.revenue += s.total;
        group.cost += s.costTotal;
        group.profit += s.profit;
        group.markup = group.revenue - group.cost;
        group.markupPercent =
          group.cost > 0 ? Number(((group.markup / group.cost) * 100).toFixed(1)) : 0;

        s.items.forEach((item) => {
          const itemPrev = group.itemsSold.get(item.productId) || {
            name: item.name,
            qty: 0,
            unit: item.unit,
            total: 0,
          };
          group.itemsSold.set(item.productId, {
            name: item.name,
            qty: itemPrev.qty + item.quantity,
            unit: item.unit,
            total: itemPrev.total + item.total,
          });
        });
      });

    return Array.from(weekGroups.values())
      .map((g) => {
        const topItem = Array.from(g.itemsSold.values()).sort((a, b) => b.total - a.total)[0];
        const margin = g.revenue > 0 ? Math.round((g.profit / g.revenue) * 100) : 0;
        return {
          ...g,
          margin,
          bestSeller: topItem,
        };
      })
      .sort((a, b) => b.weekStartTimestamp - a.weekStartTimestamp);
  }, [sales]);

  // ==================== SUMMARIZING SALES BY MONTH ====================
  const salesByMonth = useMemo(() => {
    const monthGroups = new Map<
      string,
      {
        monthLabel: string;
        timestamp: number;
        checksCount: number;
        revenue: number;
        cost: number;
        markup: number;
        markupPercent: number;
        profit: number;
        itemsSold: Map<string, { name: string; qty: number; unit: string; total: number }>;
      }
    >();

    sales
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        const d = new Date(s.timestamp);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

        if (!monthGroups.has(monthKey)) {
          monthGroups.set(monthKey, {
            monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
            checksCount: 0,
            revenue: 0,
            cost: 0,
            markup: 0,
            markupPercent: 0,
            profit: 0,
            itemsSold: new Map(),
          });
        }

        const group = monthGroups.get(monthKey)!;
        group.checksCount += 1;
        group.revenue += s.total;
        group.cost += s.costTotal;
        group.profit += s.profit;
        group.markup = group.revenue - group.cost;
        group.markupPercent =
          group.cost > 0 ? Number(((group.markup / group.cost) * 100).toFixed(1)) : 0;

        s.items.forEach((item) => {
          const itemPrev = group.itemsSold.get(item.productId) || {
            name: item.name,
            qty: 0,
            unit: item.unit,
            total: 0,
          };
          group.itemsSold.set(item.productId, {
            name: item.name,
            qty: itemPrev.qty + item.quantity,
            unit: item.unit,
            total: itemPrev.total + item.total,
          });
        });
      });

    return Array.from(monthGroups.values())
      .map((g) => {
        const topItem = Array.from(g.itemsSold.values()).sort((a, b) => b.total - a.total)[0];
        const margin = g.revenue > 0 ? Math.round((g.profit / g.revenue) * 100) : 0;
        return {
          ...g,
          margin,
          bestSeller: topItem,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [sales]);

  // Export report to CSV
  const handleExportReportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let fileName = `otchet_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (viewMode === 'markup-analysis') {
      headers = [
        'Товар',
        'Штрих-код',
        'Категория',
        'Сатылган саны',
        'Оптом наркы (1 даана)',
        'Жалпы Оптом наркы (Закупка)',
        'Коюлган үстөк %',
        'Розница сатуу баасы (1 даана)',
        'Общий сатылган баа (Выручка)',
        'Коюлган үстөк баасы (Наценка)',
        'Таза пайда',
        'Иш жүзүндөгү үстөк %',
      ];
      rows = productMarkupAnalysis.map((p) => [
        `"${p.name}"`,
        `"${p.barcode}"`,
        `"${p.category}"`,
        `${p.quantitySold} ${p.unit}`,
        p.costPrice,
        p.totalCost,
        `${p.configuredMarkupPercent}%`,
        p.salePrice,
        p.totalRevenue,
        p.totalMarkup,
        p.netProfit,
        `${p.realizedMarkupPercent}%`,
      ]);
    } else if (viewMode === 'financial-statement') {
      headers = [
        'Категория',
        'Сатылган товар саны',
        'Жалпы Оптом наркы (Закупка)',
        'Коюлган үстөк баасы (Наценка)',
        'Үстөк %',
        'Общий сатылган баа (Выручка)',
        'Таза пайда',
        'Маржа %',
      ];
      rows = categoryFinancials.map((c) => [
        `"${c.category}"`,
        c.countSold,
        c.totalCost,
        c.totalMarkup,
        `${c.markupPercent}%`,
        c.totalRevenue,
        c.netProfit,
        `${c.marginPercent}%`,
      ]);
    } else if (viewMode === 'by-day') {
      headers = [
        'Дата (Күн)',
        'Чектер саны',
        'Оптом алынган наркы (Закупка)',
        'Үстөк % (Наценка %)',
        'Үстөк баасы (Наценка суммасы)',
        'Общий сатылган баа (Выручка)',
        'Таза пайда (Net Profit)',
        'Маржа %',
        'Эң көп сатылган товар',
        'Сатылган саны',
      ];
      rows = salesByDay.map((g) => [
        `"${g.dateStr}"`,
        g.checksCount,
        g.cost,
        `${g.markupPercent}%`,
        g.markup,
        g.revenue,
        g.profit,
        `${g.margin}%`,
        `"${g.bestSeller ? g.bestSeller.name : '—'}"`,
        g.bestSeller ? `${g.bestSeller.qty} ${g.bestSeller.unit}` : '—',
      ]);
    } else if (viewMode === 'by-week') {
      headers = [
        'Апта (Мезгил)',
        'Чектер саны',
        'Оптом алынган наркы (Закупка)',
        'Үстөк % (Наценка %)',
        'Үстөк баасы (Наценка суммасы)',
        'Общий сатылган баа (Выручка)',
        'Таза пайда (Net Profit)',
        'Маржа %',
        'Апта лидери товар',
        'Сатылган саны',
      ];
      rows = salesByWeek.map((g) => [
        `"${g.weekLabel}"`,
        g.checksCount,
        g.cost,
        `${g.markupPercent}%`,
        g.markup,
        g.revenue,
        g.profit,
        `${g.margin}%`,
        `"${g.bestSeller ? g.bestSeller.name : '—'}"`,
        g.bestSeller ? `${g.bestSeller.qty} ${g.bestSeller.unit}` : '—',
      ]);
    } else if (viewMode === 'by-month') {
      headers = [
        'Ай (Жыл)',
        'Чектер саны',
        'Оптом алынган наркы (Закупка)',
        'Үстөк % (Наценка %)',
        'Үстөк баасы (Наценка суммасы)',
        'Общий сатылган баа (Выручка)',
        'Таза пайда (Net Profit)',
        'Маржа %',
        'Айдын башкы товары',
        'Сатылган саны',
      ];
      rows = salesByMonth.map((g) => [
        `"${g.monthLabel}"`,
        g.checksCount,
        g.cost,
        `${g.markupPercent}%`,
        g.markup,
        g.revenue,
        g.profit,
        `${g.margin}%`,
        `"${g.bestSeller ? g.bestSeller.name : '—'}"`,
        g.bestSeller ? `${g.bestSeller.qty} ${g.bestSeller.unit}` : '—',
      ]);
    } else {
      headers = [
        'Чек номери',
        'Убактысы',
        'Төлөм түрү',
        'Оптом наркы (Закупка)',
        'Үстөк %',
        'Общий сатылган баа',
        'Таза пайда',
        'Абалы',
      ];
      rows = filteredSales.map((s) => {
        const sCost = s.costTotal;
        const sMarkup = s.total - sCost;
        const sPct = sCost > 0 ? Number(((sMarkup / sCost) * 100).toFixed(1)) : 0;
        return [
          `"${s.id}"`,
          `"${new Date(s.timestamp).toLocaleString('ru-RU')}"`,
          s.paymentMethod,
          sCost,
          `${sPct}%`,
          s.total,
          s.profit,
          s.status,
        ];
      });
    }

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div id="reports-accounting-view" className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-6 bg-white border-b border-neutral-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              <span>Финансылык Отчет жана Аналитика</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Оптом баасы, үстөк % коюлган баа, общий сатылган баа жана таза пайда боюнча өзүнчө отчеттор
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintSummary}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-neutral-500" />
              <span>Басып чыгаруу</span>
            </button>
            <button
              onClick={handleExportReportCSV}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>CSV Экспорт</span>
            </button>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1.5 rounded-2xl overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                viewMode === 'overview'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>Жалпы сереп</span>
            </button>

            {/* SEPARATE REPORT 1: Markup % & Price Analysis */}
            <button
              onClick={() => setViewMode('markup-analysis')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                viewMode === 'markup-analysis'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Үстөк % жана Маржа Анализи</span>
            </button>

            {/* SEPARATE REPORT 2: Separate Financial Balance Statement */}
            <button
              onClick={() => setViewMode('financial-statement')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                viewMode === 'financial-statement'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Финансылык Баланс Отчету</span>
            </button>

            <button
              onClick={() => setViewMode('by-day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                viewMode === 'by-day'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Күндөлүк (By Day)</span>
            </button>

            <button
              onClick={() => setViewMode('by-week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                viewMode === 'by-week'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Апталык (By Week)</span>
            </button>

            <button
              onClick={() => setViewMode('by-month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                viewMode === 'by-month'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Айлык (By Month)</span>
            </button>
          </div>

          {/* Period filter for Overview, Markup Analysis, and Financial Statement */}
          {(viewMode === 'overview' ||
            viewMode === 'markup-analysis' ||
            viewMode === 'financial-statement') && (
            <div className="flex items-center gap-1 text-xs overflow-x-auto max-w-full scrollbar-none py-0.5">
              <span className="text-neutral-400 font-medium mr-1 hidden sm:inline">Мезгил:</span>
              {(['today', 'yesterday', '7days', 'month', 'all'] as const).map((p) => {
                const labels: Record<string, string> = {
                  today: 'Бүгүн',
                  yesterday: 'Кечээ',
                  '7days': '7 күн',
                  month: 'Ушул ай',
                  all: 'Бардыгы',
                };
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap shrink-0 ${
                      period === p
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ======================================================== */}
        {viewMode === 'overview' && (
          <>
            {/* Top Aggregate KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Sold Price (Общий сатылган баа + Төлөнгөн карыздар) */}
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                  <span>Жалпы сатуу жана түшүм</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-neutral-900">
                  {totalRevenueWithDebts.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-neutral-500">{settings.currency}</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-1.5 space-y-0.5 pt-1 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span>Сатуулар (Чектер):</span>
                    <span className="font-semibold text-neutral-800">
                      {totalRevenue.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  {totalDebtCollected > 0 && (
                    <div className="flex items-center justify-between text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-600" />
                        <span>Карыздан түшкөн:</span>
                      </span>
                      <span>+{totalDebtCollected.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  {totalDebtCollected === 0 && (
                    <div className="text-[10px] text-neutral-400">
                      Чектер: {checkCount} шт
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Wholesale Cost (Оптом наркы / Закупка) */}
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                  <span>Оптом алынган наркы</span>
                  <ShoppingBag className="w-4 h-4 text-neutral-500" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-neutral-700">
                  {totalCost.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-neutral-500">{settings.currency}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Товарлардын өз баасы
                </div>
              </div>

              {/* Card 3: Markup Amount & % (Үстөк коюлган % жана баа) */}
              <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
                <div className="flex items-center justify-between text-blue-800 text-xs font-medium mb-1">
                  <span>Үстөк коюлган баасы</span>
                  <Percent className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-blue-700">
                  +{totalMarkup.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-blue-500">{settings.currency}</span>
                </div>
                <div className="text-[11px] font-bold text-blue-800 mt-1 flex items-center gap-1">
                  <span>Орточо үстөк:</span>
                  <span className="bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded-sm">
                    +{averageMarkupPercent}%
                  </span>
                </div>
              </div>

              {/* Card 4: Net Profit (Таза пайда) */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                <div className="flex items-center justify-between text-emerald-800 text-xs font-medium mb-1">
                  <span>Таза пайда (Net Profit)</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700">
                  +{netProfit.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-emerald-600">{settings.currency}</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                  Маржа (Рентабелдүүлүк): {marginPercent}%
                </div>
              </div>

              {/* Card 5: Average Check */}
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                  <span>Орточо чек (Avg Ticket)</span>
                  <Receipt className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-neutral-900">
                  {averageCheck.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-neutral-500">{settings.currency}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Кайтарылган: {refundedSales.length} чек
                </div>
              </div>
            </div>

            {/* Store Expenses & True Net Profit Banner */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-2xl p-4 sm:p-5 border border-neutral-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Чыгымдардан кийинки ТАЗА КИРЕШЕ (Нетто Пайда)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Ижара, электр, айлык акы эске алынды
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1">
                    Соодадан дүң пайда: <b className="text-emerald-400">+{netProfit.toLocaleString()} {settings.currency}</b> &nbsp;|&nbsp; 
                    Дүкөндүн чыгашалары ({filteredExpenses.length} төлөм): <b className="text-rose-400">-{totalPeriodExpenses.toLocaleString()} {settings.currency}</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    ТАЗА НЕТТО КИРЕШЕ
                  </div>
                  <div className={`text-xl sm:text-2xl font-black ${trueNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {trueNetProfit >= 0 ? '+' : ''}{trueNetProfit.toLocaleString()} {settings.currency}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Таза маржа: {trueNetMargin}%
                  </div>
                </div>
                {onOpenExpensesTab && (
                  <button
                    onClick={onOpenExpensesTab}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition flex items-center gap-1.5"
                  >
                    <span>Чыгымдар модулу</span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Middle Grid: Payment Breakdown & Best Selling Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment Methods Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-neutral-500" />
                  <span>Төлөм түрлөрү боюнча түшүм</span>
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Накталай (Касса)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-neutral-900">
                        {combinedCashInflow.cash.toLocaleString()} {settings.currency}
                      </span>
                      {debtPaymentBreakdown.cash > 0 && (
                        <div className="text-[10px] text-emerald-700 font-medium">
                          (карыздан: +{debtPaymentBreakdown.cash.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Банк картасы (Терминал)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-neutral-900">
                        {combinedCashInflow.card.toLocaleString()} {settings.currency}
                      </span>
                      {debtPaymentBreakdown.card > 0 && (
                        <div className="text-[10px] text-blue-700 font-medium">
                          (карыздан: +{debtPaymentBreakdown.card.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <QrCode className="w-4 h-4 text-purple-600" />
                      <span>MBank / QR төлөм</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-neutral-900">
                        {combinedCashInflow.qr.toLocaleString()} {settings.currency}
                      </span>
                      {debtPaymentBreakdown.qr > 0 && (
                        <div className="text-[10px] text-purple-700 font-medium">
                          (карыздан: +{debtPaymentBreakdown.qr.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>

                  {totalDebtCollected > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                        <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Карыздан кайтарылган төлөм</span>
                      </div>
                      <span className="font-black text-xs text-emerald-800">
                        +{totalDebtCollected.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>Карызга берилген (Насия)</span>
                    </div>
                    <span className="font-bold text-xs text-amber-900">
                      {paymentBreakdown.debt.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                {/* Profit Margin Progress Bar */}
                <div className="pt-2 border-t border-neutral-100">
                  <div className="flex justify-between text-xs text-neutral-600 mb-1">
                    <span>Жалпы рентабелдүүлүк маржасы:</span>
                    <span className="font-bold text-emerald-700">{marginPercent}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Best-selling Items Ranking */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Эң көп сатылган товарлар (Лидерлер)</span>
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    {period === 'today' ? 'Бүгүнкү күндө' : 'Тандалган мезгилде'}
                  </span>
                </div>

                <div className="divide-y divide-neutral-100">
                  {bestSellingItems.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400 text-xs">
                      Бул мезгилде сатуулар жок
                    </div>
                  ) : (
                    bestSellingItems.map((item, idx) => {
                      return (
                        <div
                          key={item.name}
                          className="py-2.5 flex items-center justify-between text-xs hover:bg-neutral-50/60 rounded-lg px-2 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : idx === 1
                                  ? 'bg-neutral-200 text-neutral-700'
                                  : idx === 2
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-neutral-900 block">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                                <span>
                                  Сатылды: <b>{item.quantity}</b> {item.unit}
                                </span>
                                <span className="text-neutral-300">•</span>
                                <span className="text-blue-700 font-medium">
                                  Үстөк: +{item.markupPercent}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-neutral-900">
                              {item.totalRevenue.toLocaleString()} {settings.currency}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              Пайда: +{item.profit.toLocaleString()} {settings.currency}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Debt Payments Inflow Section (Карыздардан түшкөн төлөмдөр) */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                    <Zap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                      <span>Карыздардан кайтарылган төлөмдөр (Кассалык түшүм)</span>
                      {filteredDebtPayments.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          +{totalDebtCollected.toLocaleString()} {settings.currency}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Кардарлар күнү келбестен эрте же убагында төлөгөн суммалар кассага кошулду
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-500">
                    Жалпы: <b>{filteredDebtPayments.length}</b> төлөм
                  </span>
                  {onOpenDebtsTab && (
                    <button
                      onClick={onOpenDebtsTab}
                      className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 font-semibold text-neutral-700 text-xs flex items-center gap-1 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Карыздар дептери</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredDebtPayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-400">
                  Тандалган мезгилде карыздан төлөм түшкөн жок
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Кардар</th>
                        <th className="py-2.5 px-3">Телефон</th>
                        <th className="py-2.5 px-3">Төлөнгөн убактысы</th>
                        <th className="py-2.5 px-3">Төлөм түрү</th>
                        <th className="py-2.5 px-3">Мөөнөтү (Дедлайн)</th>
                        <th className="py-2.5 px-3 text-center">Төлөм тартиби (Эрте/Убагында)</th>
                        <th className="py-2.5 px-4 text-right">Төлөнгөн сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredDebtPayments.map((item, idx) => {
                        const mLabels: Record<string, string> = {
                          cash: 'Накталай',
                          card: 'Карта',
                          qr: 'MBank / QR',
                        };
                        return (
                          <tr key={`${item.debtorId}-${item.payment.id}-${idx}`} className="hover:bg-neutral-50/70 transition">
                            <td className="py-2.5 px-4 font-bold text-neutral-900">
                              {item.debtorName}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600 font-mono text-[11px]">
                              {item.debtorPhone || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600">
                              {new Date(item.payment.timestamp).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-700">
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-medium">
                                {mLabels[item.payment.paymentMethod] || item.payment.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600">
                              {item.dueDate ? (
                                <span className="text-[11px] font-medium">{item.dueDate}</span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.isEarly ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Zap className="w-3 h-3 text-emerald-600" />
                                  <span>Күнүнө жетпей төлөнгөн ({item.daysEarly > 0 ? `${item.daysEarly} күн эрте` : 'мөөнөтүнөн эрте'}) ⭐</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700">
                                  <CheckCircle2 className="w-3 h-3 text-neutral-500" />
                                  <span>Кабыл алынды</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-emerald-700">
                              +{item.payment.amount.toLocaleString()} {settings.currency}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sales Ledger (Чектер тарыхы) */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-neutral-500" />
                  <span>Касса журналы (Чектер тарыхы)</span>
                </h3>
                <span className="text-xs text-neutral-500">
                  Жалпы: {filteredSales.length} чек
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase">
                    <tr>
                      <th className="py-3 px-4">Чек №</th>
                      <th className="py-3 px-3">Убактысы</th>
                      <th className="py-3 px-3">Товарлар</th>
                      <th className="py-3 px-3">Төлөм түрү</th>
                      <th className="py-3 px-3 text-right">Оптом наркы</th>
                      <th className="py-3 px-3 text-center">Үстөк %</th>
                      <th className="py-3 px-3 text-right">Общий сатылган баа</th>
                      <th className="py-3 px-3 text-right">Таза пайда</th>
                      <th className="py-3 px-3 text-center">Абалы</th>
                      <th className="py-3 px-4 text-center">Аракеттер</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-neutral-400">
                          Бул мезгил боюнча чектер табылган жок
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => {
                        const sCost = sale.costTotal;
                        const sMarkup = sale.total - sCost;
                        const sPct =
                          sCost > 0 ? Number(((sMarkup / sCost) * 100).toFixed(1)) : 0;

                        return (
                          <tr key={sale.id} className="hover:bg-neutral-50/70 transition">
                            <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                              {sale.id}
                            </td>
                            <td className="py-3 px-3 text-neutral-500">
                              {new Date(sale.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              <span className="text-[10px] text-neutral-400 block">
                                {new Date(sale.timestamp).toLocaleDateString('ru-RU')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-neutral-700">
                              <span className="font-semibold">
                                {sale.items.reduce((acc, i) => acc + i.quantity, 0)} шт
                              </span>{' '}
                              <span className="text-[10px] text-neutral-400">
                                ({sale.items.length} түр)
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 font-medium capitalize">
                                {sale.paymentMethod === 'cash' && 'Накталай'}
                                {sale.paymentMethod === 'card' && 'Банк картасы'}
                                {sale.paymentMethod === 'qr' && 'MBank / QR'}
                                {sale.paymentMethod === 'debt' && `Карыз (${sale.customerName})`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-neutral-600 font-medium">
                              {sCost.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800">
                                +{sPct}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-neutral-900">
                              {sale.total.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700">
                              +{sale.profit.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {sale.status === 'completed' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Сатылды
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                  Кайтарылды
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => onViewReceipt(sale)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Чекти көрүү / Печать"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendReceiptViaWhatsApp(sale, settings);
                                  }}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  title="WhatsApp аркылуу чек жөнөтүү"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                {sale.status === 'completed' && (
                                  <button
                                    onClick={() => setSelectedSaleForRefund(sale)}
                                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Возврат жасоо (Товарды кайтаруу)"
                                  >
                                    <RotateCcw className="w-4 h-4" />
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
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SEPARATE REPORT - MARKUP % & MARGIN ANALYSIS */}
        {/* ======================================================== */}
        {viewMode === 'markup-analysis' && (
          <div className="space-y-6">
            {/* Summary Banner for Markup % and Net Profit */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-neutral-900 rounded-2xl p-6 text-white shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 mb-2">
                    <Percent className="w-3.5 h-3.5" />
                    Өзүнчө Отчет: Үстөк % жана Таза пайда
                  </span>
                  <h3 className="text-xl font-black">
                    Коюлган Үстөк (Наценка) жана Пайда Эсеби
                  </h3>
                  <p className="text-xs text-blue-100/80 mt-1 max-w-xl">
                    Оптом алынган баасына кошулган пайыздык үстөктөр өзүнчө эсептелип, товарлардын сатылышы боюнча таза киреше так көрсөтүлөт.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10">
                    <div className="text-[11px] text-blue-200 font-medium">Орточо үстөк пайызы:</div>
                    <div className="text-2xl font-black text-amber-300">+{averageMarkupPercent}%</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10">
                    <div className="text-[11px] text-blue-200 font-medium">Жалпы үстөк суммасы:</div>
                    <div className="text-2xl font-black text-emerald-300">
                      +{totalMarkup.toLocaleString()} {settings.currency}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">
                  1. Оптом алынган баасы (Закупка)
                </span>
                <div className="text-xl font-bold text-neutral-800">
                  {totalCost.toLocaleString()} {settings.currency}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Сатылган товарлардын өздүк наркы
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/10 shadow-xs">
                <span className="text-xs font-semibold text-blue-800 block mb-1">
                  2. Үстөк коюлган % баасы (Наценка)
                </span>
                <div className="text-xl font-black text-blue-700">
                  +{totalMarkup.toLocaleString()} {settings.currency}
                </div>
                <p className="text-[11px] text-blue-600 font-medium mt-1">
                  Орточо үстөк: +{averageMarkupPercent}%
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">
                  3. Общий сатылган баасы (Түшүм)
                </span>
                <div className="text-xl font-black text-neutral-900">
                  {totalRevenue.toLocaleString()} {settings.currency}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Оптом баасы + Үстөк = Жалпы түшүм
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                <span className="text-xs font-semibold text-emerald-800 block mb-1">
                  4. ТАЗА ПАЙДА (Net Profit)
                </span>
                <div className="text-xl font-black text-emerald-700">
                  +{netProfit.toLocaleString()} {settings.currency}
                </div>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">
                  Рентабелдүүлүк маржасы: {marginPercent}%
                </p>
              </div>
            </div>

            {/* Product Breakdown Table with Search & Sort */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span>Товарлар боюнча үстөк % жана пайда аналитикасы</span>
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Ар бир тиричилик техникасынын закупкасы, үстөк пайызы, сатуу наркы жана таза пайдасы
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Товарды издөө..."
                      value={markupSearchTerm}
                      onChange={(e) => setMarkupSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden w-48"
                    />
                  </div>

                  <select
                    value={markupSortBy}
                    onChange={(e) => setMarkupSortBy(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white font-medium text-neutral-700 focus:outline-hidden"
                  >
                    <option value="profit-desc">Пайда боюнча (Көптөн азайга)</option>
                    <option value="markup-desc">Үстөк суммасы боюнча</option>
                    <option value="percent-desc">Үстөк % боюнча</option>
                    <option value="revenue-desc">Жалпы сатылган суммасы</option>
                    <option value="qty-desc">Сатылган саны боюнча</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Товар & Категория</th>
                      <th className="py-3 px-3 text-center">Сатылган сан</th>
                      <th className="py-3 px-3 text-right">Оптом баасы (1 даана)</th>
                      <th className="py-3 px-3 text-right">Жалпы Оптом наркы</th>
                      <th className="py-3 px-3 text-center">Коюлган Үстөк %</th>
                      <th className="py-3 px-3 text-right">Розница сатуу баасы</th>
                      <th className="py-3 px-3 text-right">Коюлган үстөк баасы</th>
                      <th className="py-3 px-3 text-right">Общий сатылган баа</th>
                      <th className="py-3 px-3 text-right">Таза пайда</th>
                      <th className="py-3 px-3 text-center">Иш жүзүндө %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {productMarkupAnalysis.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-neutral-400">
                          Бул мезгилде сатылган товарлар табылган жок
                        </td>
                      </tr>
                    ) : (
                      productMarkupAnalysis.map((p) => (
                        <tr key={p.productId} className="hover:bg-neutral-50/80 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-neutral-900 block">{p.name}</span>
                            <span className="text-[11px] text-neutral-400">
                              {p.category} • {p.barcode || 'Штрих-код жок'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-neutral-800">
                            {p.quantitySold} {p.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-neutral-600 font-medium">
                            {p.costPrice.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-neutral-700">
                            {p.totalCost.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              +{p.configuredMarkupPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-neutral-800">
                            {p.salePrice.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-blue-700">
                            +{p.totalMarkup.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-neutral-900">
                            {p.totalRevenue.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            +{p.netProfit.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              +{p.realizedMarkupPercent}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {productMarkupAnalysis.length > 0 && (
                    <tfoot className="bg-neutral-50 font-bold border-t-2 border-neutral-200 text-neutral-900 text-xs">
                      <tr>
                        <td className="py-3 px-4 font-black">ЖАЛПЫ ЖЫЙЫНТЫК:</td>
                        <td className="py-3 px-3 text-center">
                          {productMarkupAnalysis.reduce((a, b) => a + b.quantitySold, 0)} даана
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-400">—</td>
                        <td className="py-3 px-3 text-right text-neutral-800">
                          {totalCost.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3 text-center text-blue-800">
                          +{averageMarkupPercent}% орточо
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-400">—</td>
                        <td className="py-3 px-3 text-right text-blue-700">
                          +{totalMarkup.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-neutral-900">
                          {totalRevenue.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-black">
                          +{netProfit.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-800">
                          +{averageMarkupPercent}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SEPARATE REPORT - FINANCIAL STATEMENT / BALANCE */}
        {/* ======================================================== */}
        {viewMode === 'financial-statement' && (
          <div className="space-y-6">
            {/* Financial Statement Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-200">
                <div>
                  <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                    <span>Финансылык Баланс жана Таза Пайда Отчету</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Товарлардын оптом баасы, үстөк пайызы, общий сатылган баасы жана таза киреше бөлүштүрүлүшү
                  </p>
                </div>
                <div className="text-xs font-semibold bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-xl self-start">
                  Мезгил: {period === 'today' ? 'Бүгүнкү күндө' : period === 'yesterday' ? 'Кечээ' : period === '7days' ? 'Акыркы 7 күн' : period === 'month' ? 'Ушул ай' : 'Бардык мезгил'}
                </div>
              </div>

              {/* Four Ledger Sections: Revenue -> Cost -> Markup -> Net Profit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SECTION 1: GROSS SALES REVENUE */}
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      I. Сооданын жалпы түшүмү (Sales Revenue)
                    </span>
                    <span className="text-xs font-bold text-neutral-900">Суммасы</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Каталог баасы боюнча сатуу:</span>
                      <span className="font-semibold text-neutral-800">
                        {totalCatalogPrice.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    {totalDiscounts > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>Берилген арзандатуулар (Скидки):</span>
                        <span className="font-semibold">
                          -{totalDiscounts.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-neutral-600">
                      <span>Жалпы катталган чектер саны:</span>
                      <span className="font-semibold text-neutral-800">{checkCount} чек</span>
                    </div>

                    <div className="flex justify-between text-neutral-600">
                      <span>1 чектин орточо суммасы:</span>
                      <span className="font-semibold text-neutral-800">
                        {averageCheck.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    {totalDebtCollected > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Карыздардан кайтарылган төлөмдөр (Кассага кирген):</span>
                        </span>
                        <span>+{totalDebtCollected.toLocaleString()} {settings.currency}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-black text-neutral-900 pt-2 border-t border-neutral-200">
                      <span>= ЖАЛПЫ САТЫЛГАН ЖАНА ТҮШКӨН СУММА:</span>
                      <span className="text-neutral-900 font-black text-base">
                        {totalRevenueWithDebts.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: COST OF GOODS SOLD */}
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      II. Оптом алынган баасы (Себестоимость / Закупка)
                    </span>
                    <span className="text-xs font-bold text-neutral-900">Наркы</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Складдан сатылган техникалардын оптом баасы:</span>
                      <span className="font-semibold text-neutral-800">
                        {totalCost.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-600">
                      <span>Сатылган товарлардын жалпы саны:</span>
                      <span className="font-semibold text-neutral-800">
                        {activeSales.reduce(
                          (acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0),
                          0
                        )}{' '}
                        даана
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-600">
                      <span>Түшүмдөгү өздүк нарктын үлүшү:</span>
                      <span className="font-semibold text-neutral-800">
                        {totalRevenue > 0 ? ((totalCost / totalRevenue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-black text-neutral-800 pt-5 border-t border-neutral-200">
                      <span>= ЖАЛПЫ ОПТОМ НАРКЫ (ЗАКУПКА):</span>
                      <span>
                        {totalCost.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: MARKUP BREAKDOWN */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      III. Коюлган Үстөк (Наценка / Markup)
                    </span>
                    <span className="text-xs font-bold text-blue-900">Кошулган баа</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-700">
                      <span>Оптом наркына кошулган баа (Үстөк суммасы):</span>
                      <span className="font-bold text-blue-700">
                        +{totalMarkup.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-700">
                      <span>Орточо үстөк коюу пайызы:</span>
                      <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-sm">
                        +{averageMarkupPercent}%
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-600">
                      <span>Үстөк алуу эрежеси:</span>
                      <span className="font-medium text-neutral-700">
                        Розница = Оптом + (Оптом × % / 100)
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-black text-blue-900 pt-5 border-t border-blue-200">
                      <span>= ЖАЛПЫ ҮСТӨК КОШУМЧА БААСЫ:</span>
                      <span>
                        +{totalMarkup.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: NET PROFIT & CHANNELS */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      IV. Жыйынтык Таза Пайда (Net Profit)
                    </span>
                    <span className="text-xs font-bold text-emerald-900">Пайда</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-700">
                      <span>Накталай түшкөн таза пайда:</span>
                      <span className="font-semibold text-emerald-800">
                        +
                        {(
                          totalRevenue > 0
                            ? Math.round((paymentBreakdown.cash / totalRevenue) * netProfit)
                            : 0
                        ).toLocaleString()}{' '}
                        {settings.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-700">
                      <span>Банк жана MBank QR аркылуу:</span>
                      <span className="font-semibold text-emerald-800">
                        +
                        {(
                          totalRevenue > 0
                            ? Math.round(
                                ((paymentBreakdown.card + paymentBreakdown.qr) / totalRevenue) *
                                  netProfit
                              )
                            : 0
                        ).toLocaleString()}{' '}
                        {settings.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-700">
                      <span>Карызга берилген (Аласа):</span>
                      <span className="font-semibold text-amber-800">
                        {paymentBreakdown.debt.toLocaleString()} {settings.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-black text-emerald-900 pt-5 border-t border-emerald-200">
                      <span>= ЖЫЙЫНТЫК ТАЗА ПАЙДА:</span>
                      <span className="text-emerald-700 font-black text-base">
                        +{netProfit.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category-by-category Financial Statement Table */}
              <div className="pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800 mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span>Категориялар боюнча сатуу, үстөк жана таза пайда таблицасы</span>
                </h4>

                <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase">
                      <tr>
                        <th className="py-3 px-4">Категория</th>
                        <th className="py-3 px-3 text-center">Сатылган товар</th>
                        <th className="py-3 px-3 text-right">Оптом наркы (Закупка)</th>
                        <th className="py-3 px-3 text-right">Коюлган үстөк баасы</th>
                        <th className="py-3 px-3 text-center">Үстөк %</th>
                        <th className="py-3 px-3 text-right">Общий сатылган баа</th>
                        <th className="py-3 px-3 text-right">Таза пайда</th>
                        <th className="py-3 px-3 text-center">Рентабелдүүлүк</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {categoryFinancials.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-neutral-400">
                            Маалымат жок
                          </td>
                        </tr>
                      ) : (
                        categoryFinancials.map((cat) => (
                          <tr key={cat.category} className="hover:bg-neutral-50/70 transition">
                            <td className="py-3 px-4 font-bold text-neutral-900">
                              {cat.category}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-neutral-700">
                              {cat.countSold} шт
                            </td>
                            <td className="py-3 px-3 text-right text-neutral-600 font-medium">
                              {cat.totalCost.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-blue-700">
                              +{cat.totalMarkup.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800">
                                +{cat.markupPercent}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-neutral-900">
                              {cat.totalRevenue.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700">
                              +{cat.netProfit.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800">
                                {cat.marginPercent}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SUMMARIZING SALES BY DAY */}
        {/* ======================================================== */}
        {viewMode === 'by-day' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <span>Күндөлүк Сатуу Отчету (Daily Sales Summary)</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Күн сайын: оптом алынган нарк, коюлган үстөк %, общий сатылган баа жана таза пайда
                </p>
              </div>
              <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg">
                Жалпы: {salesByDay.length} күн катталган
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Күнү (Дата)</th>
                    <th className="py-3 px-3 text-center">Чектер саны</th>
                    <th className="py-3 px-3 text-right">Оптом наркы (Закупка)</th>
                    <th className="py-3 px-3 text-center">Үстөк %</th>
                    <th className="py-3 px-3 text-right">Үстөк баасы</th>
                    <th className="py-3 px-3 text-right">Общий сатылган баа</th>
                    <th className="py-3 px-3 text-right">Таза пайда</th>
                    <th className="py-3 px-3 text-center">Маржа %</th>
                    <th className="py-3 px-4">Күндүн башкы товары</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {salesByDay.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-400">
                        Сатуулар каттала элек
                      </td>
                    </tr>
                  ) : (
                    salesByDay.map((day) => (
                      <tr key={day.dateStr} className="hover:bg-neutral-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-neutral-900">
                          {day.dateStr}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="bg-neutral-100 text-neutral-800 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                            {day.checksCount} чек
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right text-neutral-600 font-medium">
                          {day.cost.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800">
                            +{day.markupPercent}%
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-blue-700">
                          +{day.markup.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-neutral-900">
                          {day.revenue.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                          +{day.profit.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                            {day.margin}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {day.bestSeller ? (
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <div>
                                <span className="font-semibold text-neutral-900 block">
                                  {day.bestSeller.name}
                                </span>
                                <span className="text-[11px] text-neutral-400">
                                  {day.bestSeller.qty} {day.bestSeller.unit} (
                                  {day.bestSeller.total.toLocaleString()} {settings.currency})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: SUMMARIZING SALES BY WEEK */}
        {/* ======================================================== */}
        {viewMode === 'by-week' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Апталык Сатуу Отчету (Weekly Sales Summary)</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Апта боюнча: оптом алынган нарк, коюлган үстөк %, общий сатылган баа жана таза пайда
                </p>
              </div>
              <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg">
                Жалпы: {salesByWeek.length} апта
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Апталык мезгил</th>
                    <th className="py-3 px-3 text-center">Чектер саны</th>
                    <th className="py-3 px-3 text-right">Оптом наркы (Закупка)</th>
                    <th className="py-3 px-3 text-center">Үстөк %</th>
                    <th className="py-3 px-3 text-right">Үстөк баасы</th>
                    <th className="py-3 px-3 text-right">Общий сатылган баа</th>
                    <th className="py-3 px-3 text-right">Таза пайда</th>
                    <th className="py-3 px-3 text-center">Маржа %</th>
                    <th className="py-3 px-4">Аптанын башкы товары</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {salesByWeek.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-400">
                        Сатуулар каттала элек
                      </td>
                    </tr>
                  ) : (
                    salesByWeek.map((week) => (
                      <tr key={week.weekLabel} className="hover:bg-neutral-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-neutral-900">
                          {week.weekLabel}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="bg-neutral-100 text-neutral-800 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                            {week.checksCount} чек
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right text-neutral-600 font-medium">
                          {week.cost.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800">
                            +{week.markupPercent}%
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-blue-700">
                          +{week.markup.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-neutral-900">
                          {week.revenue.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                          +{week.profit.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                            {week.margin}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {week.bestSeller ? (
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <div>
                                <span className="font-semibold text-neutral-900 block">
                                  {week.bestSeller.name}
                                </span>
                                <span className="text-[11px] text-neutral-400">
                                  {week.bestSeller.qty} {week.bestSeller.unit} (
                                  {week.bestSeller.total.toLocaleString()} {settings.currency})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: SUMMARIZING SALES BY MONTH */}
        {/* ======================================================== */}
        {viewMode === 'by-month' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Айлык Сатуу Отчету (Monthly Sales Summary)</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Ай сайын: оптом алынган нарк, коюлган үстөк %, общий сатылган баа жана таза пайда
                </p>
              </div>
              <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg">
                Жалпы: {salesByMonth.length} ай катталган
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Айы жана Жылы</th>
                    <th className="py-3 px-3 text-center">Чектер саны</th>
                    <th className="py-3 px-3 text-right">Оптом наркы (Закупка)</th>
                    <th className="py-3 px-3 text-center">Үстөк %</th>
                    <th className="py-3 px-3 text-right">Үстөк баасы</th>
                    <th className="py-3 px-3 text-right">Общий сатылган баа</th>
                    <th className="py-3 px-3 text-right">Таза пайда</th>
                    <th className="py-3 px-3 text-center">Маржа %</th>
                    <th className="py-3 px-4">Айдын эң көп сатылган товары</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {salesByMonth.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-400">
                        Сатуулар каттала элек
                      </td>
                    </tr>
                  ) : (
                    salesByMonth.map((month) => (
                      <tr key={month.monthLabel} className="hover:bg-neutral-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-neutral-900">
                          {month.monthLabel}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="bg-neutral-100 text-neutral-800 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                            {month.checksCount} чек
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right text-neutral-600 font-medium">
                          {month.cost.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800">
                            +{month.markupPercent}%
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-blue-700">
                          +{month.markup.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-neutral-900">
                          {month.revenue.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                          +{month.profit.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                            {month.margin}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {month.bestSeller ? (
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <div>
                                <span className="font-semibold text-neutral-900 block">
                                  {month.bestSeller.name}
                                </span>
                                <span className="text-[11px] text-neutral-400">
                                  {month.bestSeller.qty} {month.bestSeller.unit} (
                                  {month.bestSeller.total.toLocaleString()} {settings.currency})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {selectedSaleForRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200">
            <h4 className="text-base font-bold text-neutral-900 mb-1">
              Чекти кайтаруу (Возврат)
            </h4>
            <p className="text-xs text-neutral-600 mb-4">
              Чек <b>{selectedSaleForRefund.id}</b> боюнча бардык товарлар кайра складга кошулат жана сатуу жокко чыгарылат.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Кайтаруунун себеби:
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedSaleForRefund(null)}
                className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
              >
                Жокко чыгаруу
              </button>
              <button
                type="button"
                onClick={() => {
                  onRefundSale(selectedSaleForRefund.id, refundReason);
                  setSelectedSaleForRefund(null);
                }}
                className="flex-1 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
              >
                Возвратты бекитүү
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

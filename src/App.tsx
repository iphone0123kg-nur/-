import React, { useState, useEffect } from 'react';
import {
  Product,
  Sale,
  CartItem,
  ShopSettings,
  Debtor,
  Customer,
  PaymentMethod,
  StockAdjustment,
  Expense,
} from './types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredSales,
  saveStoredSales,
  getStoredSettings,
  saveStoredSettings,
  getStoredDebtors,
  saveStoredDebtors,
  getStoredCustomers,
  saveStoredCustomers,
  getStoredCategories,
  saveStoredCategories,
  getStoredAdjustments,
  saveStoredAdjustments,
  getStoredExpenses,
  saveStoredExpenses,
} from './utils/storage';
import { PosRegister } from './components/PosRegister';
import { InventoryManager } from './components/InventoryManager';
import { ReportsAccounting } from './components/ReportsAccounting';
import { DebtsTracker } from './components/DebtsTracker';
import { CustomersDirectory } from './components/CustomersDirectory';
import { ReceiptModal } from './components/ReceiptModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminAiAssistant } from './components/AdminAiAssistant';
import { ExpensesManager } from './components/ExpensesManager';
import {
  Store,
  ShoppingCart,
  Boxes,
  BarChart3,
  BookOpen,
  Users,
  Settings,
  Clock,
  User,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'reports' | 'debts' | 'expenses' | 'customers' | 'ai-assistant'>('pos');
  const [products, setProducts] = useState<Product[]>(getStoredProducts);
  const [sales, setSales] = useState<Sale[]>(getStoredSales);
  const [settings, setSettings] = useState<ShopSettings>(getStoredSettings);
  const [debtors, setDebtors] = useState<Debtor[]>(getStoredDebtors);
  const [customers, setCustomers] = useState<Customer[]>(getStoredCustomers);
  const [categories, setCategories] = useState<string[]>(getStoredCategories);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(getStoredAdjustments);
  const [expenses, setExpenses] = useState<Expense[]>(getStoredExpenses);

  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save changes to localStorage
  const updateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    saveStoredProducts(newProducts);
  };

  const updateSales = (newSales: Sale[]) => {
    setSales(newSales);
    saveStoredSales(newSales);
  };

  const updateDebtors = (newDebtors: Debtor[]) => {
    setDebtors(newDebtors);
    saveStoredDebtors(newDebtors);
  };

  const updateCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    saveStoredCustomers(newCustomers);
  };

  const updateSettings = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  const updateCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    saveStoredCategories(newCategories);
  };

  const updateExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    saveStoredExpenses(newExpenses);
  };

  const handleAddExpense = (newExpData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExp: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
    };
    updateExpenses([newExp, ...expenses]);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    updateExpenses(expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
  };

  const handleDeleteExpense = (id: string) => {
    updateExpenses(expenses.filter((e) => e.id !== id));
  };

  // Complete Sale Handler (POS Checkout)
  const handleCompleteSale = (saleData: {
    cart: CartItem[];
    subtotal: number;
    discountAmount: number;
    total: number;
    paymentData: {
      paymentMethod: PaymentMethod;
      cashReceived?: number;
      cashChange?: number;
      customerName?: string;
      customerPhone?: string;
      paidNowAmount?: number;
      paidNowMethod?: 'cash' | 'card' | 'qr';
      debtAmount?: number;
      debtDueDate?: string;
      splitPayment?: {
        cashAmount?: number;
        qrAmount?: number;
        cardAmount?: number;
      };
      notes?: string;
    };
  }) => {
    const nextCheckNumber = sales.length > 0 ? 1000 + sales.length + 1 : 1001;
    const checkId = `CHK-${nextCheckNumber}`;

    let costTotal = 0;
    const saleItems = saleData.cart.map((item) => {
      const price = item.customPrice ?? item.product.salePrice;
      const itemSubtotal = price * item.quantity;
      
      let itemDiscount = 0;
      let effectivePercent = 0;
      if (item.discountMode === 'amount') {
        itemDiscount = Math.min(itemSubtotal, Math.max(0, item.discountValue || 0));
        effectivePercent = itemSubtotal > 0 ? Number(((itemDiscount / itemSubtotal) * 100).toFixed(1)) : 0;
      } else {
        effectivePercent = Math.min(100, Math.max(0, item.discountValue !== undefined ? item.discountValue : item.discountPercent || 0));
        itemDiscount = Math.round((itemSubtotal * effectivePercent) / 100);
      }

      const itemTotal = Math.max(0, itemSubtotal - itemDiscount);
      costTotal += item.product.costPrice * item.quantity;

      const markupPercent =
        item.product.costPrice > 0
          ? Number((((price - item.product.costPrice) / item.product.costPrice) * 100).toFixed(1))
          : 0;

      return {
        productId: item.product.id,
        name: item.product.name,
        barcode: item.product.barcode,
        category: item.product.category,
        quantity: item.quantity,
        unit: item.product.unit,
        costPrice: item.product.costPrice,
        salePrice: price,
        markupPercent,
        discountMode: item.discountMode || (item.discountPercent > 0 ? 'percent' : undefined),
        discountValue: item.discountValue !== undefined ? item.discountValue : (item.discountPercent || 0),
        discountPercent: effectivePercent,
        discountAmount: itemDiscount,
        total: itemTotal,
      };
    });

    const newSale: Sale = {
      id: checkId,
      timestamp: Date.now(),
      items: saleItems,
      subtotal: saleData.subtotal,
      discountAmount: saleData.discountAmount,
      total: saleData.total,
      costTotal,
      profit: Math.max(0, saleData.total - costTotal),
      paymentMethod: saleData.paymentData.paymentMethod,
      cashReceived: saleData.paymentData.cashReceived,
      cashChange: saleData.paymentData.cashChange,
      customerName: saleData.paymentData.customerName,
      customerPhone: saleData.paymentData.customerPhone,
      paidNowAmount: saleData.paymentData.paidNowAmount,
      paidNowMethod: saleData.paymentData.paidNowMethod,
      debtAmount: saleData.paymentData.debtAmount,
      debtDueDate: saleData.paymentData.debtDueDate,
      splitPayment: saleData.paymentData.splitPayment,
      cashierName: settings.cashierName,
      notes: saleData.paymentData.notes,
      status: 'completed',
    };

    // 1. Decrement inventory stock
    const updatedProducts = products.map((prod) => {
      const cartMatch = saleData.cart.find((ci) => ci.product.id === prod.id);
      if (cartMatch) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - cartMatch.quantity),
          updatedAt: Date.now(),
        };
      }
      return prod;
    });
    updateProducts(updatedProducts);

    // 2. Add to sales history
    const updatedSales = [newSale, ...sales];
    updateSales(updatedSales);

    // 3. Automatically add or update customer in customers directory
    if (saleData.paymentData.customerName && saleData.paymentData.customerName.trim()) {
      const cName = saleData.paymentData.customerName.trim();
      const cPhone = saleData.paymentData.customerPhone?.trim() || '';

      const existingCust = customers.find(
        (c) =>
          c.name.trim().toLowerCase() === cName.toLowerCase() ||
          (cPhone && c.phone && c.phone.trim() === cPhone)
      );

      if (existingCust) {
        const updatedCusts = customers.map((c) =>
          c.id === existingCust.id
            ? {
                ...c,
                phone: c.phone || cPhone,
                updatedAt: Date.now(),
              }
            : c
        );
        updateCustomers(updatedCusts);
      } else {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: cName,
          phone: cPhone,
          notes: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        updateCustomers([newCust, ...customers]);
      }
    }

    // 4. If debt or partial debt, update debtor ledger
    const isDebtSale =
      saleData.paymentData.paymentMethod === 'debt' ||
      saleData.paymentData.paymentMethod === 'partial_debt' ||
      Boolean(saleData.paymentData.debtAmount && saleData.paymentData.debtAmount > 0);

    if (isDebtSale && saleData.paymentData.customerName) {
      const debtorName = saleData.paymentData.customerName.trim();
      const debtorPhone = saleData.paymentData.customerPhone?.trim() || '';
      const actualDebt =
        saleData.paymentData.debtAmount !== undefined
          ? saleData.paymentData.debtAmount
          : Math.max(0, saleData.total - (saleData.paymentData.paidNowAmount || 0));

      const paidNow = saleData.paymentData.paidNowAmount || 0;
      const initialDownpayment =
        paidNow > 0
          ? [
              {
                id: `pay-down-${Date.now()}`,
                timestamp: Date.now(),
                amount: paidNow,
                paymentMethod: saleData.paymentData.paidNowMethod || 'qr',
                notes: `Чек ${checkId} боюнча сатуу күнү төлөнгөн (${
                  saleData.paymentData.paidNowMethod === 'qr'
                    ? 'Мбанк QR'
                    : saleData.paymentData.paidNowMethod === 'card'
                    ? 'Карта'
                    : 'Накталай'
                })`,
                dueDateAtPayment: saleData.paymentData.debtDueDate,
                paidEarly: true,
                daysEarly: 30,
              },
            ]
          : [];

      const existingDebtor = debtors.find(
        (d) => d.name.trim().toLowerCase() === debtorName.toLowerCase()
      );

      if (existingDebtor) {
        const updatedDebtors = debtors.map((d) =>
          d.id === existingDebtor.id
            ? {
                ...d,
                totalDebt: d.totalDebt + saleData.total,
                paidAmount: d.paidAmount + paidNow,
                balance: d.balance + actualDebt,
                phone: d.phone || debtorPhone,
                dueDate: saleData.paymentData.debtDueDate || d.dueDate,
                saleIds: [...d.saleIds, checkId],
                updatedAt: Date.now(),
                payments: [...d.payments, ...initialDownpayment],
              }
            : d
        );
        updateDebtors(updatedDebtors);
      } else {
        const newDebtor: Debtor = {
          id: `deb-${Date.now()}`,
          name: debtorName,
          phone: debtorPhone,
          totalDebt: saleData.total,
          paidAmount: paidNow,
          balance: actualDebt,
          dueDate: saleData.paymentData.debtDueDate,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          saleIds: [checkId],
          payments: initialDownpayment,
        };
        updateDebtors([...debtors, newDebtor]);
      }
    }

    // 5. Open thermal receipt modal
    setActiveReceiptSale(newSale);
  };

  // Refund Sale Handler
  const handleRefundSale = (saleId: string, reason: string) => {
    const saleToRefund = sales.find((s) => s.id === saleId);
    if (!saleToRefund || saleToRefund.status === 'refunded') return;

    // Return inventory stock
    const updatedProducts = products.map((prod) => {
      const itemMatch = saleToRefund.items.find((i) => i.productId === prod.id);
      if (itemMatch) {
        return {
          ...prod,
          stock: prod.stock + itemMatch.quantity,
          updatedAt: Date.now(),
        };
      }
      return prod;
    });
    updateProducts(updatedProducts);

    // Mark sale as refunded
    const updatedSales = sales.map((s) =>
      s.id === saleId
        ? {
            ...s,
            status: 'refunded' as const,
            refundTimestamp: Date.now(),
            refundReason: reason,
          }
        : s
    );
    updateSales(updatedSales);
  };

  // Product CRUD
  const handleAddProduct = (prodData: Omit<Product, 'id' | 'updatedAt'>) => {
    const newProd: Product = {
      ...prodData,
      id: `prod-${Date.now()}`,
      updatedAt: Date.now(),
    };
    updateProducts([newProd, ...products]);
  };

  const handleUpdateProduct = (updated: Product) => {
    updateProducts(products.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProduct = (productId: string) => {
    updateProducts(products.filter((p) => p.id !== productId));
  };

  const handleRestock = (
    productId: string,
    qty: number,
    newCost?: number,
    newSalePrice?: number
  ) => {
    updateProducts(
      products.map((p) => {
        if (p.id === productId) {
          const cost = newCost !== undefined && newCost > 0 ? newCost : p.costPrice;
          const sale = newSalePrice !== undefined && newSalePrice > 0 ? newSalePrice : p.salePrice;
          const markup = cost > 0 ? Number((((sale - cost) / cost) * 100).toFixed(1)) : 0;
          return {
            ...p,
            stock: p.stock + qty,
            costPrice: cost,
            salePrice: sale,
            markupPercent: markup,
            updatedAt: Date.now(),
          };
        }
        return p;
      })
    );
  };

  const handleManualAdjustStock = (
    productId: string,
    newStock: number,
    reason: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const previousStock = prod.stock;
    const difference = newStock - previousStock;

    const newAdj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      productId,
      productName: prod.name,
      previousStock,
      newStock,
      difference,
      reason,
      timestamp: Date.now(),
    };

    const updated = [newAdj, ...adjustments];
    setAdjustments(updated);
    saveStoredAdjustments(updated);

    updateProducts(
      products.map((p) =>
        p.id === productId ? { ...p, stock: newStock, updatedAt: Date.now() } : p
      )
    );
  };

  const handleAddCategory = (newCat: string) => {
    if (!categories.includes(newCat)) {
      updateCategories([...categories, newCat]);
    }
  };

  // Debt Payment Handler
  const handlePayDebt = (
    debtorId: string,
    amount: number,
    method: 'cash' | 'card' | 'qr',
    notes?: string
  ) => {
    const updatedDebtors = debtors.map((d) => {
      if (d.id === debtorId) {
        const newPaid = d.paidAmount + amount;
        const now = Date.now();
        let paidEarly = false;
        let daysEarly = 0;

        if (d.dueDate) {
          const dueDateTime = new Date(`${d.dueDate}T23:59:59`).getTime();
          if (now < dueDateTime) {
            const diffMs = dueDateTime - now;
            daysEarly = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            paidEarly = daysEarly >= 1;
          }
        }

        return {
          ...d,
          paidAmount: newPaid,
          balance: Math.max(0, d.totalDebt - newPaid),
          updatedAt: now,
          payments: [
            ...d.payments,
            {
              id: `pay-${now}`,
              timestamp: now,
              amount,
              paymentMethod: method,
              notes,
              dueDateAtPayment: d.dueDate,
              paidEarly,
              daysEarly,
            },
          ],
        };
      }
      return d;
    });
    updateDebtors(updatedDebtors);
  };

  const handleAddManualDebt = (
    name: string,
    phone: string,
    amount: number,
    notes?: string,
    dueDate?: string
  ) => {
    const existing = debtors.find((d) => d.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (existing) {
      updateDebtors(
        debtors.map((d) =>
          d.id === existing.id
            ? {
                ...d,
                totalDebt: d.totalDebt + amount,
                balance: d.balance + amount,
                phone: d.phone || phone,
                dueDate: dueDate || d.dueDate,
                updatedAt: Date.now(),
              }
            : d
        )
      );
    } else {
      const newD: Debtor = {
        id: `deb-${Date.now()}`,
        name,
        phone,
        totalDebt: amount,
        paidAmount: 0,
        balance: amount,
        dueDate,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        saleIds: [],
        payments: [],
      };
      updateDebtors([...debtors, newD]);
    }

    // Also auto-add to customers list if new
    const existingCust = customers.find(
      (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (!existingCust) {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name,
        phone,
        notes: notes || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updateCustomers([newCust, ...customers]);
    }
  };

  const handleResetData = () => {
    setProducts(getStoredProducts());
    setSales(getStoredSales());
    setDebtors(getStoredDebtors());
    setCustomers(getStoredCustomers());
    setSettings(getStoredSettings());
    setCategories(getStoredCategories());
    setAdjustments(getStoredAdjustments());
    setExpenses(getStoredExpenses());
  };

  // Low stock badge count
  const lowStockAlertCount = products.filter(
    (p) => p.stock <= p.minStock
  ).length;

  return (
    <div id="pos-application-root" className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-900 text-neutral-800 antialiased font-sans">
      {/* Top Main Navigation Bar */}
      <header className="h-14 bg-neutral-900 text-white border-b border-neutral-800 px-4 flex items-center justify-between shrink-0 select-none">
        {/* Brand & Store Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">
                {settings.shopName}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Касса ачык
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 hidden sm:block">
              {settings.address || 'ПОС Касса & Товардык учет'}
            </p>
          </div>
        </div>

        {/* Desktop / Tablet Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-800 p-1 rounded-xl">
          <button
            id="nav-pos-tab"
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Касса (Сатуу)</span>
          </button>

          <button
            id="nav-inventory-tab"
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`relative px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Товарлар & Склад</span>
            {lowStockAlertCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-black flex items-center justify-center">
                {lowStockAlertCount}
              </span>
            )}
          </button>

          <button
            id="nav-reports-tab"
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'reports'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Отчеттор (Учет)</span>
          </button>

          <button
            id="nav-expenses-tab"
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'expenses'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Чыгымдар</span>
          </button>

          <button
            id="nav-debts-tab"
            type="button"
            onClick={() => setActiveTab('debts')}
            className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'debts'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Карыз дептери</span>
            {debtors.filter((d) => d.balance > 0).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {debtors.filter((d) => d.balance > 0).length}
              </span>
            )}
          </button>

          <button
            id="nav-customers-tab"
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'customers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Кардарлар</span>
            {customers.length > 0 && (
              <span className="w-5 h-4 rounded-full bg-neutral-700 text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                {customers.length}
              </span>
            )}
          </button>

          <button
            id="nav-ai-assistant-tab"
            type="button"
            onClick={() => setActiveTab('ai-assistant')}
            className={`relative px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'ai-assistant'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-neutral-800 border border-emerald-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold">AI Жардамчы</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[9px] text-emerald-300 font-extrabold uppercase border border-emerald-400/30 hidden lg:inline">
              Admin
            </span>
          </button>
        </nav>

        {/* Right Tools (Cashier, Time, Settings) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex md:hidden items-center gap-1.5 text-xs text-neutral-300 bg-neutral-800 px-2 py-1 rounded-lg">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[90px]">{settings.cashierName}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              {currentTime.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-300 bg-neutral-800/80 px-2.5 py-1 rounded-lg">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[120px]">{settings.cashierName}</span>
          </div>

          <button
            id="open-settings-btn"
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Дүкөн жана Касса жөндөөлөрү"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden pb-16 md:pb-0">
        {activeTab === 'pos' && (
          <PosRegister
            products={products}
            categories={categories}
            settings={settings}
            debtors={debtors}
            customers={customers}
            onCompleteSale={handleCompleteSale}
            onOpenQuickAddProduct={() => setActiveTab('inventory')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            products={products}
            categories={categories}
            settings={settings}
            adjustments={adjustments}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onRestock={handleRestock}
            onManualAdjustStock={handleManualAdjustStock}
            onAddCategory={handleAddCategory}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsAccounting
            sales={sales}
            settings={settings}
            expenses={expenses}
            debtors={debtors}
            onViewReceipt={(sale) => setActiveReceiptSale(sale)}
            onRefundSale={handleRefundSale}
            onOpenExpensesTab={() => setActiveTab('expenses')}
            onOpenDebtsTab={() => setActiveTab('debts')}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesManager
            expenses={expenses}
            sales={sales}
            settings={settings}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'debts' && (
          <DebtsTracker
            debtors={debtors}
            sales={sales}
            settings={settings}
            onPayDebt={handlePayDebt}
            onAddManualDebt={handleAddManualDebt}
            onViewSaleReceipt={(sale) => setActiveReceiptSale(sale)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersDirectory
            customers={customers}
            sales={sales}
            debtors={debtors}
            currency={settings.currency}
            onUpdateCustomers={updateCustomers}
            onViewSaleReceipt={(sale) => setActiveReceiptSale(sale)}
            onOpenDebtsTab={() => setActiveTab('debts')}
          />
        )}

        {activeTab === 'ai-assistant' && (
          <AdminAiAssistant
            debtors={debtors}
            sales={sales}
            products={products}
            settings={settings}
            expenses={expenses}
            onOpenDebtsTab={() => setActiveTab('debts')}
            onOpenReportsTab={() => setActiveTab('reports')}
            onOpenExpensesTab={() => setActiveTab('expenses')}
          />
        )}
      </main>

      {/* Receipt Modal */}
      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          settings={settings}
          onClose={() => setActiveReceiptSale(null)}
          onNewSale={() => {
            setActiveReceiptSale(null);
            setActiveTab('pos');
          }}
          defaultPhone={
            activeReceiptSale.customerPhone ||
            customers.find(
              (c) =>
                activeReceiptSale.customerName &&
                c.name.trim().toLowerCase() === activeReceiptSale.customerName.trim().toLowerCase()
            )?.phone
          }
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSaveSettings={updateSettings}
          onResetData={handleResetData}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Mobile Bottom Navigation Bar (Phone & Portrait Tablets) */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 grid grid-cols-7 px-1 py-1.5 shadow-2xl"
      >
        {/* 1. POS Register */}
        <button
          id="mobile-nav-pos-btn"
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            activeTab === 'pos'
              ? 'text-emerald-400 font-bold bg-neutral-800/80'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] sm:text-[10px] leading-tight">Касса</span>
        </button>

        {/* 2. Inventory / Stock */}
        <button
          id="mobile-nav-inventory-btn"
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition ${
            activeTab === 'inventory'
              ? 'text-emerald-400 font-bold bg-neutral-800/80'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            {lowStockAlertCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-neutral-950 text-[9px] font-black flex items-center justify-center">
                {lowStockAlertCount}
              </span>
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] leading-tight">Склад</span>
        </button>

        {/* 3. Reports */}
        <button
          id="mobile-nav-reports-btn"
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            activeTab === 'reports'
              ? 'text-emerald-400 font-bold bg-neutral-800/80'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] sm:text-[10px] leading-tight">Отчет</span>
        </button>

        {/* 4. Expenses */}
        <button
          id="mobile-nav-expenses-btn"
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            activeTab === 'expenses'
              ? 'text-rose-400 font-bold bg-neutral-800/80'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] sm:text-[10px] leading-tight">Чыгым</span>
        </button>

        {/* 5. Debts */}
        <button
          id="mobile-nav-debts-btn"
          type="button"
          onClick={() => setActiveTab('debts')}
          className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition ${
            activeTab === 'debts'
              ? 'text-amber-400 font-bold bg-neutral-800/80'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            {debtors.filter((d) => d.balance > 0).length > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-neutral-950 text-[9px] font-black flex items-center justify-center">
                {debtors.filter((d) => d.balance > 0).length}
              </span>
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] leading-tight">Карыз</span>
        </button>

        {/* 6. Customers */}
        <button
          id="mobile-nav-customers-btn"
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition ${
            activeTab === 'customers'
              ? 'text-emerald-400 font-bold bg-neutral-800/80'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] sm:text-[10px] leading-tight">Кардар</span>
        </button>

        {/* 7. AI Assistant */}
        <button
          id="mobile-nav-ai-btn"
          type="button"
          onClick={() => setActiveTab('ai-assistant')}
          className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition ${
            activeTab === 'ai-assistant'
              ? 'text-emerald-300 font-extrabold bg-emerald-950/70 ring-1 ring-emerald-500/40'
              : 'text-emerald-400/80 hover:text-emerald-300'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 text-emerald-400 animate-pulse" />
          </div>
          <span className="text-[9px] sm:text-[10px] leading-tight font-bold">AI</span>
        </button>
      </nav>
    </div>
  );
}

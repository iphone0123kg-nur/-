import { Debtor, Product, Sale, ShopSettings, Expense } from '../types';

export interface StoreContextSummary {
  timestamp: string;
  currency: string;
  debts: {
    totalDebtAmount: number;
    activeDebtorsCount: number;
    overdueDebtorsCount: number;
    overdueTotalAmount: number;
    debtors: Array<{
      name: string;
      phone: string;
      balance: number;
      dueDate?: string;
      isOverdue: boolean;
      overdueDays?: number;
      lastPaymentDate?: string;
    }>;
  };
  daily: {
    date: string;
    salesCount: number;
    revenue: number;
    cost: number;
    grossProfit: number;
    expenses: number;
    profit: number; // Net Profit (grossProfit - expenses)
    markupPercent: number;
    marginPercent: number;
    paymentBreakdown: {
      cash: number;
      card: number;
      qr: number;
      debt: number;
    };
    topProducts: Array<{ name: string; quantity: number; total: number }>;
  };
  weekly: {
    period: string;
    salesCount: number;
    revenue: number;
    cost: number;
    grossProfit: number;
    expenses: number;
    profit: number; // Net Profit (grossProfit - expenses)
    marginPercent: number;
    topProducts: Array<{ name: string; quantity: number; profit: number }>;
  };
  monthly: {
    monthName: string;
    salesCount: number;
    revenue: number;
    cost: number;
    grossProfit: number;
    expenses: number;
    profit: number; // Net Profit (grossProfit - expenses)
    marginPercent: number;
    rentExpenses: number;
    electricityExpenses: number;
    salaryExpenses: number;
    otherExpenses: number;
  };
  expenses: {
    todayExpenses: number;
    weeklyExpenses: number;
    monthlyExpenses: number;
    monthlyBreakdown: {
      rent: number;
      electricity: number;
      salary: number;
      utilities: number;
      taxes: number;
      transport: number;
      marketing: number;
      maintenance: number;
      other: number;
    };
    recentExpenses: Array<{
      title: string;
      category: string;
      amount: number;
      date: string;
      paymentMethod: string;
    }>;
  };
  inventory: {
    totalItems: number;
    totalStockUnits: number;
    totalCostValue: number;
    totalRetailValue: number;
    lowStockCount: number;
    lowStockList: Array<{ name: string; stock: number; minStock: number; unit: string }>;
  };
}

export function buildStoreContextSummary(
  debtors: Debtor[],
  sales: Sale[],
  products: Product[],
  settings: ShopSettings,
  expenses: Expense[] = []
): StoreContextSummary {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Active completed sales
  const completedSales = sales.filter((s) => s.status === 'completed');

  // Debts calculation
  const todayDateObj = new Date();
  todayDateObj.setHours(0, 0, 0, 0);

  const activeDebtors = debtors
    .filter((d) => d.balance > 0)
    .map((d) => {
      let isOverdue = false;
      let overdueDays = 0;
      if (d.dueDate) {
        const dueObj = new Date(d.dueDate);
        dueObj.setHours(0, 0, 0, 0);
        if (dueObj.getTime() < todayDateObj.getTime()) {
          isOverdue = true;
          overdueDays = Math.ceil(
            (todayDateObj.getTime() - dueObj.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }

      const lastPayment =
        d.payments && d.payments.length > 0
          ? new Date(d.payments[d.payments.length - 1].timestamp).toLocaleDateString('ru-RU')
          : undefined;

      return {
        name: d.name,
        phone: d.phone,
        balance: d.balance,
        dueDate: d.dueDate,
        isOverdue,
        overdueDays: isOverdue ? overdueDays : undefined,
        lastPaymentDate: lastPayment,
      };
    })
    .sort((a, b) => b.balance - a.balance);

  const totalDebtAmount = activeDebtors.reduce((acc, d) => acc + d.balance, 0);
  const overdueDebtors = activeDebtors.filter((d) => d.isOverdue);
  const overdueTotalAmount = overdueDebtors.reduce((acc, d) => acc + d.balance, 0);

  // Daily (Today)
  const todaySales = completedSales.filter((s) => {
    const saleDateStr = new Date(s.timestamp).toISOString().split('T')[0];
    return saleDateStr === todayStr;
  });

  const dailyRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const dailyCost = todaySales.reduce((acc, s) => acc + s.costTotal, 0);
  const dailyProfit = todaySales.reduce((acc, s) => acc + s.profit, 0);
  const dailyMarkupPct =
    dailyCost > 0 ? Number((((dailyRevenue - dailyCost) / dailyCost) * 100).toFixed(1)) : 0;
  const dailyMarginPct =
    dailyRevenue > 0 ? Number(((dailyProfit / dailyRevenue) * 100).toFixed(1)) : 0;

  const dailyPaymentBreakdown = {
    cash: 0,
    card: 0,
    qr: 0,
    debt: 0,
  };

  const dailyProductsMap = new Map<string, { name: string; quantity: number; total: number }>();

  todaySales.forEach((s) => {
    if (s.paymentMethod === 'cash') dailyPaymentBreakdown.cash += s.total;
    else if (s.paymentMethod === 'card') dailyPaymentBreakdown.card += s.total;
    else if (s.paymentMethod === 'qr') dailyPaymentBreakdown.qr += s.total;
    else if (s.paymentMethod === 'debt') dailyPaymentBreakdown.debt += s.total;
    else if (s.paymentMethod === 'partial_debt') {
      const debtPart = s.debtAmount !== undefined ? s.debtAmount : s.total - (s.paidNowAmount || 0);
      dailyPaymentBreakdown.debt += debtPart;
      const paidPart = s.paidNowAmount || 0;
      if (s.paidNowMethod === 'card') dailyPaymentBreakdown.card += paidPart;
      else if (s.paidNowMethod === 'qr') dailyPaymentBreakdown.qr += paidPart;
      else dailyPaymentBreakdown.cash += paidPart;
    }

    s.items.forEach((it) => {
      const existing = dailyProductsMap.get(it.productId) || {
        name: it.name,
        quantity: 0,
        total: 0,
      };
      existing.quantity += it.quantity;
      existing.total += it.total;
      dailyProductsMap.set(it.productId, existing);
    });
  });

  const dailyTopProducts = Array.from(dailyProductsMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Weekly (Last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const weeklySales = completedSales.filter((s) => s.timestamp >= sevenDaysAgo.getTime());

  const weeklyRevenue = weeklySales.reduce((acc, s) => acc + s.total, 0);
  const weeklyCost = weeklySales.reduce((acc, s) => acc + s.costTotal, 0);
  const weeklyProfit = weeklySales.reduce((acc, s) => acc + s.profit, 0);
  const weeklyMarginPct =
    weeklyRevenue > 0 ? Number(((weeklyProfit / weeklyRevenue) * 100).toFixed(1)) : 0;

  const weeklyProductsMap = new Map<string, { name: string; quantity: number; profit: number }>();
  weeklySales.forEach((s) => {
    s.items.forEach((it) => {
      const itProfit = (it.salePrice - it.costPrice) * it.quantity - (it.discountAmount || 0);
      const existing = weeklyProductsMap.get(it.productId) || {
        name: it.name,
        quantity: 0,
        profit: 0,
      };
      existing.quantity += it.quantity;
      existing.profit += itProfit;
      weeklyProductsMap.set(it.productId, existing);
    });
  });

  const weeklyTopProducts = Array.from(weeklyProductsMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // Monthly (Current month)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthlySales = completedSales.filter((s) => s.timestamp >= startOfMonth);

  const monthlyRevenue = monthlySales.reduce((acc, s) => acc + s.total, 0);
  const monthlyCost = monthlySales.reduce((acc, s) => acc + s.costTotal, 0);
  const monthlyProfit = monthlySales.reduce((acc, s) => acc + s.profit, 0);
  const monthlyMarginPct =
    monthlyRevenue > 0 ? Number(((monthlyProfit / monthlyRevenue) * 100).toFixed(1)) : 0;

  const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  // Inventory valuation
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalCostValue = products.reduce((acc, p) => acc + p.costPrice * p.stock, 0);
  const totalRetailValue = products.reduce((acc, p) => acc + p.salePrice * p.stock, 0);
  const lowStockProducts = products
    .filter((p) => p.stock <= p.minStock)
    .map((p) => ({
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
    }));

  // Store Expenses calculations
  const todayExpensesList = expenses.filter((e) => e.date === todayStr);
  const todayExpensesTotal = todayExpensesList.reduce((acc, e) => acc + e.amount, 0);
  const dailyGrossProfit = dailyProfit;
  const dailyNetProfit = dailyGrossProfit - todayExpensesTotal;

  const weeklyExpensesList = expenses.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= sevenDaysAgo.getTime() - 86400000;
  });
  const weeklyExpensesTotal = weeklyExpensesList.reduce((acc, e) => acc + e.amount, 0);
  const weeklyGrossProfit = weeklyProfit;
  const weeklyNetProfit = weeklyGrossProfit - weeklyExpensesTotal;

  const monthlyExpensesList = expenses.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= startOfMonth - 86400000;
  });
  const monthlyExpensesTotal = monthlyExpensesList.reduce((acc, e) => acc + e.amount, 0);
  const monthlyGrossProfit = monthlyProfit;
  const monthlyNetProfit = monthlyGrossProfit - monthlyExpensesTotal;
  const monthlyNetMarginPct =
    monthlyRevenue > 0 ? Number(((monthlyNetProfit / monthlyRevenue) * 100).toFixed(1)) : 0;

  const monthlyBreakdown = {
    rent: 0,
    electricity: 0,
    salary: 0,
    utilities: 0,
    taxes: 0,
    transport: 0,
    marketing: 0,
    maintenance: 0,
    other: 0,
  };

  monthlyExpensesList.forEach((e) => {
    if (e.category === 'rent') monthlyBreakdown.rent += e.amount;
    else if (e.category === 'electricity') monthlyBreakdown.electricity += e.amount;
    else if (e.category === 'salary') monthlyBreakdown.salary += e.amount;
    else if (e.category === 'utilities') monthlyBreakdown.utilities += e.amount;
    else if (e.category === 'taxes') monthlyBreakdown.taxes += e.amount;
    else if (e.category === 'transport') monthlyBreakdown.transport += e.amount;
    else if (e.category === 'marketing') monthlyBreakdown.marketing += e.amount;
    else if (e.category === 'maintenance') monthlyBreakdown.maintenance += e.amount;
    else monthlyBreakdown.other += e.amount;
  });

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map((e) => ({
      title: e.title,
      category: e.category,
      amount: e.amount,
      date: e.date,
      paymentMethod: e.paymentMethod,
    }));

  return {
    timestamp: now.toISOString(),
    currency: settings.currency,
    debts: {
      totalDebtAmount,
      activeDebtorsCount: activeDebtors.length,
      overdueDebtorsCount: overdueDebtors.length,
      overdueTotalAmount,
      debtors: activeDebtors,
    },
    daily: {
      date: todayStr,
      salesCount: todaySales.length,
      revenue: dailyRevenue,
      cost: dailyCost,
      grossProfit: dailyGrossProfit,
      expenses: todayExpensesTotal,
      profit: dailyNetProfit,
      markupPercent: dailyMarkupPct,
      marginPercent: dailyMarginPct,
      paymentBreakdown: dailyPaymentBreakdown,
      topProducts: dailyTopProducts,
    },
    weekly: {
      period: 'Акыркы 7 күн',
      salesCount: weeklySales.length,
      revenue: weeklyRevenue,
      cost: weeklyCost,
      grossProfit: weeklyGrossProfit,
      expenses: weeklyExpensesTotal,
      profit: weeklyNetProfit,
      marginPercent: weeklyMarginPct,
      topProducts: weeklyTopProducts,
    },
    monthly: {
      monthName,
      salesCount: monthlySales.length,
      revenue: monthlyRevenue,
      cost: monthlyCost,
      grossProfit: monthlyGrossProfit,
      expenses: monthlyExpensesTotal,
      profit: monthlyNetProfit,
      marginPercent: monthlyNetMarginPct,
      rentExpenses: monthlyBreakdown.rent,
      electricityExpenses: monthlyBreakdown.electricity,
      salaryExpenses: monthlyBreakdown.salary,
      otherExpenses:
        monthlyBreakdown.utilities +
        monthlyBreakdown.taxes +
        monthlyBreakdown.transport +
        monthlyBreakdown.marketing +
        monthlyBreakdown.maintenance +
        monthlyBreakdown.other,
    },
    expenses: {
      todayExpenses: todayExpensesTotal,
      weeklyExpenses: weeklyExpensesTotal,
      monthlyExpenses: monthlyExpensesTotal,
      monthlyBreakdown,
      recentExpenses,
    },
    inventory: {
      totalItems: products.length,
      totalStockUnits,
      totalCostValue,
      totalRetailValue,
      lowStockCount: lowStockProducts.length,
      lowStockList: lowStockProducts,
    },
  };
}

export function generateDeterministicReport(
  type: 'debts' | 'daily' | 'weekly' | 'monthly',
  ctx: StoreContextSummary
): string {
  const c = ctx.currency;

  if (type === 'debts') {
    const d = ctx.debts;
    let text = `### 📋 Карыздар боюнча так аналитикалык отчет\n\n`;
    text += `* **Жалпы карыз суммасы:** **${d.totalDebtAmount.toLocaleString()} ${c}**\n`;
    text += `* **Карызы бар адамдардын саны:** **${d.activeDebtorsCount} адам**\n`;
    text += `* **Мөөнөтү өтүп кеткен карыздар (Просрочено):** **${d.overdueDebtorsCount} адам** (Жалпысынан: **${d.overdueTotalAmount.toLocaleString()} ${c}**)\n\n`;

    if (d.debtors.length === 0) {
      text += `Дүкөндө эч кандай карыз жок! Бардык эсептер жабылган.\n`;
    } else {
      text += `#### 👤 Карызгерлердин толук тизмеси:\n\n`;
      d.debtors.forEach((debtor, idx) => {
        const overdueTag = debtor.isOverdue
          ? ` ⚠️ **МӨӨНӨТҮ ӨТКӨН (${debtor.overdueDays} күн кечиккен)**`
          : debtor.dueDate
          ? ` (Мөөнөтү: ${debtor.dueDate})`
          : ` (Мөөнөтү белгиленген эмес)`;

        text += `${idx + 1}. **${debtor.name}** — **${debtor.balance.toLocaleString()} ${c}**${overdueTag}\n`;
        text += `   * Тел: \`${debtor.phone || 'көрсөтүлгөн эмес'}\`\n`;
      });

      text += `\n#### 💡 Админ үчүн AI сунуштары:\n`;
      if (d.overdueDebtorsCount > 0) {
        text += `1. **Мөөнөтү өткөн ${d.overdueDebtorsCount} карызгерге** бүгүн WhatsApp аркылуу сылык эстетүү жөнөтүңүз.\n`;
      }
      text += `2. Эң чоң карыз суммасы бар адамдардан график боюнча жарым-жартылай болсо да төлөм алууну макулдашыңыз.\n`;
      text += `3. Чоң суммадагы жаңы товарларды карызга берүүнү убактылуу чектөө сунушталат.\n`;
    }
    return text;
  }

  if (type === 'daily') {
    const day = ctx.daily;
    let text = `### 📊 Бүгүнкү күндүк каржылык отчет (${day.date})\n\n`;
    text += `* **Сатылган чектер:** **${day.salesCount} чек**\n`;
    text += `* **Жалпы түшкөн акча (Выручка):** **${day.revenue.toLocaleString()} ${c}**\n`;
    text += `* **Оптом наркы (Закупка чыгымы):** **${day.cost.toLocaleString()} ${c}**\n`;
    text += `* **Соодадан дүң пайда:** **+${day.grossProfit.toLocaleString()} ${c}**\n`;
    if (day.expenses > 0) {
      text += `* **Дүкөндүн күндүк чыгымдары:** **-${day.expenses.toLocaleString()} ${c}**\n`;
    }
    text += `* **ТАЗА КИРЕШЕ (НЕТТО ПАЙДА):** **+${day.profit.toLocaleString()} ${c}**\n`;
    text += `* **Орточо үстөк пайызы:** **+${day.markupPercent}%**\n`;
    text += `* **Рентабелдүүлүк маржасы:** **${day.marginPercent}%**\n\n`;

    text += `#### 💳 Төлөм ыкмалары боюнча бөлүштүрүү:\n`;
    text += `* 💵 Накталай: **${day.paymentBreakdown.cash.toLocaleString()} ${c}**\n`;
    text += `* 💳 Банк картасы: **${day.paymentBreakdown.card.toLocaleString()} ${c}**\n`;
    text += `* 📱 MBank / QR: **${day.paymentBreakdown.qr.toLocaleString()} ${c}**\n`;
    text += `* ⏳ Карызга жазылган: **${day.paymentBreakdown.debt.toLocaleString()} ${c}**\n\n`;

    if (day.topProducts.length > 0) {
      text += `#### 🏆 Бүгүнкү лидер товарлар:\n`;
      day.topProducts.forEach((p, idx) => {
        text += `${idx + 1}. **${p.name}** — ${p.quantity} шт (${p.total.toLocaleString()} ${c})\n`;
      });
    }

    text += `\n#### 💡 Күндүн жыйынтыгы боюнча баалоо:\n`;
    if (day.profit > 0) {
      text += `Бүгүнкү соода ийгиликтүү болду. Дүкөндүн таза кирешеси **+${day.profit.toLocaleString()} ${c}** (маржа: **${day.marginPercent}%**).`;
    } else {
      text += `Бүгүн азырынча сатуулар каттала элек же чектер жок.`;
    }
    return text;
  }

  if (type === 'weekly') {
    const w = ctx.weekly;
    let text = `### 📈 Жумалык каржылык отчет жана соода динамикасы (Акыркы 7 күн)\n\n`;
    text += `* **Жалпы сатылган чектер:** **${w.salesCount} чек**\n`;
    text += `* **Жалпы соода оборот:** **${w.revenue.toLocaleString()} ${c}**\n`;
    text += `* **Товарлардын өздүк наркы:** **${w.cost.toLocaleString()} ${c}**\n`;
    text += `* **Соода дүң пайдасы:** **+${w.grossProfit.toLocaleString()} ${c}**\n`;
    if (w.expenses > 0) {
      text += `* **Жумалык дүкөн чыгымдары:** **-${w.expenses.toLocaleString()} ${c}**\n`;
    }
    text += `* **ЖУМАЛЫК ТАЗА НЕТТО ПАЙДА:** **+${w.profit.toLocaleString()} ${c}**\n`;
    text += `* **Орточо таза маржа:** **${w.marginPercent}%**\n\n`;

    if (w.topProducts.length > 0) {
      text += `#### 💎 Эң көп таза пайда алып келген товарлар:\n`;
      w.topProducts.forEach((p, idx) => {
        text += `${idx + 1}. **${p.name}** — ${p.quantity} шт (Пайда: **+${p.profit.toLocaleString()} ${c}**)\n`;
      });
      text += `\n`;
    }

    text += `#### 💡 Жумалык стратегиялык сунуш:\n`;
    text += `1. Эң өтүмдүү лидер товарлардын запасын түгөнүп калбоосу үчүн алдын ала кампага толтуруңуз.\n`;
    text += `2. Пайда алып келүүсү аз, бирок текчеде көп турган товарларга акция же сезондук жеңилдик жарыялаңыз.\n`;
    return text;
  }

  // Monthly
  const m = ctx.monthly;
  let text = `### 🗓️ Айлык толук каржылык баланс жана анализ (${m.monthName})\n\n`;
  text += `* **Чектер саны:** **${m.salesCount} даана**\n`;
  text += `* **Айлык жалпы түшүм (Выручка):** **${m.revenue.toLocaleString()} ${c}**\n`;
  text += `* **Оптом алынган наркы (Закупка):** **${m.cost.toLocaleString()} ${c}**\n`;
  text += `* **Соодадан түшкөн дүң пайда (Gross Profit):** **+${m.grossProfit.toLocaleString()} ${c}**\n\n`;

  text += `#### 🏢 Дүкөндүн айлык операциялык чыгымдары: **-${m.expenses.toLocaleString()} ${c}**\n`;
  text += `* 🏢 Ижара акысы (Аренда): **${m.rentExpenses.toLocaleString()} ${c}**\n`;
  text += `* ⚡ Электр энергиясы / коммуналдык: **${m.electricityExpenses.toLocaleString()} ${c}**\n`;
  text += `* 👥 Кызматкерлердин айлыгы: **${m.salaryExpenses.toLocaleString()} ${c}**\n`;
  if (m.otherExpenses > 0) {
    text += `* 📦 Салык, транспорт жана башка чыгашалар: **${m.otherExpenses.toLocaleString()} ${c}**\n`;
  }
  text += `\n`;

  text += `#### 💎 ТАЗА КИРЕШЕ (НЕТТО ПАЙДА):\n`;
  text += `> **Таза пайда = ${m.grossProfit.toLocaleString()} ${c} (Дүң пайда) - ${m.expenses.toLocaleString()} ${c} (Чыгымдар) = +${m.profit.toLocaleString()} ${c}**\n`;
  text += `* **Таза рентабелдүүлүк маржасы:** **${m.marginPercent}%**\n\n`;

  text += `#### 📦 Товардык калдыктардын абалы:\n`;
  text += `* Жалпы товар позициялары: **${ctx.inventory.totalItems} түр**\n`;
  text += `* Текчедеги калдыктардын дүң баасы: **${ctx.inventory.totalCostValue.toLocaleString()} ${c}**\n`;
  text += `* Сатуудагы потенциалдуу баасы: **${ctx.inventory.totalRetailValue.toLocaleString()} ${c}**\n`;

  if (ctx.inventory.lowStockCount > 0) {
    text += `* ⚠️ **Запасы азайып калган товарлар:** **${ctx.inventory.lowStockCount} даана**\n`;
    ctx.inventory.lowStockList.slice(0, 5).forEach((lp) => {
      text += `   - **${lp.name}**: калды ${lp.stock} ${lp.unit} (Минималдуу чек: ${lp.minStock} ${lp.unit})\n`;
    });
  }

  return text;
}

export async function askAiAssistant(params: {
  prompt?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  storeContext: StoreContextSummary;
  reportType?: 'debts' | 'daily' | 'weekly' | 'monthly';
}): Promise<{ answer: string; usedGemini: boolean }> {
  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Сервер катасы: ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.answer) {
      return { answer: data.answer, usedGemini: true };
    }

    throw new Error(data.error || 'Жооп алынган жок');
  } catch (err: any) {
    console.warn('AI backend unavailable or key missing, falling back to local engine:', err);
    // Deterministic fallback report
    if (params.reportType) {
      return {
        answer: generateDeterministicReport(params.reportType, params.storeContext),
        usedGemini: false,
      };
    }

    // Question answering fallback
    const fallbackAnswer = generateFallbackAnswerForQuery(params.prompt || '', params.storeContext);
    return { answer: fallbackAnswer, usedGemini: false };
  }
}

function generateFallbackAnswerForQuery(query: string, ctx: StoreContextSummary): string {
  const q = query.toLowerCase();
  const c = ctx.currency;

  if (q.includes('карыз') || q.includes('долг') || q.includes('кимде')) {
    return generateDeterministicReport('debts', ctx);
  }
  if (q.includes('бүгүн') || q.includes('күндүк') || q.includes('сегодня') || q.includes('день')) {
    return generateDeterministicReport('daily', ctx);
  }
  if (q.includes('жума') || q.includes('недел') || q.includes('7 күн')) {
    return generateDeterministicReport('weekly', ctx);
  }
  if (q.includes('ай') || q.includes('месяц')) {
    return generateDeterministicReport('monthly', ctx);
  }

  return `### 💡 AI Жардамчы маалыматы:\n\n* **Жалпы карыз:** ${ctx.debts.totalDebtAmount.toLocaleString()} ${c} (${ctx.debts.activeDebtorsCount} адам)\n* **Бүгүнкү соода:** ${ctx.daily.revenue.toLocaleString()} ${c} (Таза пайда: +${ctx.daily.profit.toLocaleString()} ${c})\n* **Айлык соода:** ${ctx.monthly.revenue.toLocaleString()} ${c} (Таза пайда: +${ctx.monthly.profit.toLocaleString()} ${c})\n* **Азайган товарлар:** ${ctx.inventory.lowStockCount} түр\n\nТолук отчет алуу үчүн жогорудагы **«Карыздарды эсептөө»**, **«Күндүк отчет»**, **«Жумалык отчет»** же **«Айлык анализ»** баскычтарын басыңыз.`;
}

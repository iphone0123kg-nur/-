import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Debtor,
  Product,
  Sale,
  ShopSettings,
  Expense,
} from '../types';
import {
  Sparkles,
  Send,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Copy,
  MessageSquare,
  BarChart3,
  CalendarDays,
  PieChart,
  Bot,
  User,
  ShoppingBag,
  Package,
  Phone,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import {
  buildStoreContextSummary,
  askAiAssistant,
  generateDeterministicReport,
  StoreContextSummary,
} from '../utils/aiAnalytics';

interface AdminAiAssistantProps {
  debtors: Debtor[];
  sales: Sale[];
  products: Product[];
  settings: ShopSettings;
  expenses?: Expense[];
  onOpenDebtsTab?: () => void;
  onOpenReportsTab?: () => void;
  onOpenExpensesTab?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  reportType?: 'debts' | 'daily' | 'weekly' | 'monthly';
  usedGemini?: boolean;
}

export const AdminAiAssistant: React.FC<AdminAiAssistantProps> = ({
  debtors,
  sales,
  products,
  settings,
  expenses = [],
  onOpenDebtsTab,
  onOpenReportsTab,
  onOpenExpensesTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compute live store summary
  const storeContext: StoreContextSummary = useMemo(() => {
    return buildStoreContextSummary(debtors, sales, products, settings, expenses);
  }, [debtors, sales, products, settings, expenses]);

  // Initial welcome message from AI
  useEffect(() => {
    if (messages.length === 0) {
      const debtCount = storeContext.debts.activeDebtorsCount;
      const totalDebt = storeContext.debts.totalDebtAmount;
      const overdueCount = storeContext.debts.overdueDebtorsCount;
      const monthlyNet = storeContext.monthly.profit;
      const monthlyExp = storeContext.monthly.expenses;

      const welcomeText = `Саламатсызбы, урматтуу Администратор! 👋

Мен сиздин дүкөнүңүздүн жеке **AI каржылык жардамчыңызмын**. 
Дүкөндүн бардык карыздарын, күнүмдүк/жумалык/айлык сатууларын, операциялык чыгымдарын (ижара, электр, айлык акы) жана таза кирешесин (нетто пайда) көзөмөлдөп турамын.

📊 **Учурдагы кыскача каржылык абал:**
* 🔴 **Жалпы карыз:** **${totalDebt.toLocaleString()} ${settings.currency}** (${debtCount} кардарда)
${
  overdueCount > 0
    ? `* ⚠️ **Мөөнөтү өткөн карыздар:** **${overdueCount} адам** (Тез арада WhatsApp аркылуу эстетүү сунушталат!)`
    : `* ✅ **Мөөнөтү өткөн карыздар жок**`
}
* 🏢 **Айлык чыгымдар (ижара, свет, айлык):** **${monthlyExp.toLocaleString()} ${settings.currency}**
* 🟢 **Айлык ТАЗА КИРЕШЕ (Нетто):** **+${monthlyNet.toLocaleString()} ${settings.currency}** (Таза маржа: ${storeContext.monthly.marginPercent}%)

Төмөндөгү даяр баскычтарды басыңыз же каалаган сурооңузду бериңиз!`;

      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: welcomeText,
          timestamp: Date.now(),
          usedGemini: true,
        },
      ]);
    }
  }, [storeContext, settings.currency, messages.length]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const { answer, usedGemini } = await askAiAssistant({
        prompt: text,
        history,
        storeContext,
      });

      const modelMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: answer,
        timestamp: Date.now(),
        usedGemini,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'model',
        text: `Кечиресиз, анализ жасоодо ката кетти: ${err.message || 'Белгисиз ката'}`,
        timestamp: Date.now(),
        usedGemini: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async (type: 'debts' | 'daily' | 'weekly' | 'monthly') => {
    if (isLoading) return;

    const titles: Record<string, string> = {
      debts: 'Кимде карыз бар? Толук карыздарды эсептеп чыгар',
      daily: 'Бүгүнкү күндүк толук каржылык отчет жана анализ',
      weekly: 'Акыркы 7 күндүк жумалык соода жана пайда анализи',
      monthly: 'Ушул айдын толук каржылык анализи жана балансы',
    };

    const userPrompt = titles[type];

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userPrompt,
      timestamp: Date.now(),
      reportType: type,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { answer, usedGemini } = await askAiAssistant({
        reportType: type,
        storeContext,
      });

      const modelMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: answer,
        timestamp: Date.now(),
        reportType: type,
        usedGemini,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      // Deterministic fallback
      const fallback = generateDeterministicReport(type, storeContext);
      const modelMsg: ChatMessage = {
        id: `ai-fallback-${Date.now()}`,
        role: 'model',
        text: fallback,
        timestamp: Date.now(),
        reportType: type,
        usedGemini: false,
      };
      setMessages((prev) => [...prev, modelMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const quickPrompts = [
    {
      label: 'Кимде карыз бар?',
      prompt: 'Кимде карыз бар, тизмесин жана мөөнөтү өткөндөрдү эсептеп бер',
      icon: Users,
      color: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
    },
    {
      label: 'Күндүк отчет',
      prompt: 'Бүгүнкү соода, чыгым жана таза пайда боюнча күндүк отчет чыгар',
      icon: Calendar,
      color: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100',
    },
    {
      label: 'Жумалык анализ',
      prompt: 'Акыркы 7 күндүн каржылык анализин жана динамикасын чыгар',
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100',
    },
    {
      label: 'Айлык баланс',
      prompt: 'Ушул айдын толук каржылык отчетун жана кирешесин анализде',
      icon: CalendarDays,
      color: 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100',
    },
    {
      label: 'Азайган товарлар',
      prompt: 'Кайсы товарлардын запасы азайып калды жана эмнелерге заказ бериш керек?',
      icon: Package,
      color: 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100',
    },
  ];

  return (
    <div className="flex flex-col h-full flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 gap-3 sm:gap-4 overflow-hidden">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-emerald-950 text-white rounded-2xl p-5 shadow-lg border border-neutral-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black tracking-tight">
                AI Каржылык Жардамчы (Admin Executive AI)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              Карыздарды автоматтык эсептөө, күндүк, жумалык жана айлык каржылык отчеттор жана сунуштар
            </p>
          </div>
        </div>

        {/* Quick Link Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenDebtsTab && (
            <button
              onClick={onOpenDebtsTab}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Карыздар бөлүмү</span>
            </button>
          )}
          {onOpenReportsTab && (
            <button
              onClick={onOpenReportsTab}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 flex items-center gap-1.5 transition"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Отчеттор таблицасы</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Debt KPI */}
        <button
          onClick={() => handleGenerateReport('debts')}
          className="text-left p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-xs hover:border-amber-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <span className="font-semibold text-amber-950 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              Жалпы карыз
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-md">
              {storeContext.debts.activeDebtorsCount} адам
            </span>
          </div>
          <div className="text-lg font-black text-amber-950 tracking-tight">
            {storeContext.debts.totalDebtAmount.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center justify-between font-medium">
            <span>
              {storeContext.debts.overdueDebtorsCount > 0 ? (
                <span className="text-red-600 font-bold flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> {storeContext.debts.overdueDebtorsCount} мөөнөтү өткөн
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">Мөөнөтү өткөн жок</span>
              )}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* Today's Net Profit KPI */}
        <button
          onClick={() => handleGenerateReport('daily')}
          className="text-left p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-xs hover:border-emerald-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <span className="font-semibold text-emerald-950 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Бүгүнкү таза пайда
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded-md">
              {storeContext.daily.salesCount} чек
            </span>
          </div>
          <div className="text-lg font-black text-emerald-700 tracking-tight">
            +{storeContext.daily.profit.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between font-medium">
            <span>Сатуу: {storeContext.daily.revenue.toLocaleString()} {settings.currency}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* Weekly Turnover KPI */}
        <button
          onClick={() => handleGenerateReport('weekly')}
          className="text-left p-3.5 rounded-xl bg-white border border-blue-200/80 shadow-xs hover:border-blue-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <span className="font-semibold text-blue-950 flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              Жумалык пайда
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-900 rounded-md">
              7 күн
            </span>
          </div>
          <div className="text-lg font-black text-blue-900 tracking-tight">
            +{storeContext.weekly.profit.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between font-medium">
            <span>Оборот: {storeContext.weekly.revenue.toLocaleString()} {settings.currency}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
          </div>
        </button>

        {/* Monthly Summary KPI */}
        <button
          onClick={() => handleGenerateReport('monthly')}
          className="text-left p-3.5 rounded-xl bg-white border border-purple-200/80 shadow-xs hover:border-purple-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <span className="font-semibold text-purple-950 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
              Айлык Нетто пайда
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-900 rounded-md">
              {storeContext.monthly.salesCount} чек
            </span>
          </div>
          <div className="text-lg font-black text-purple-900 tracking-tight">
            +{storeContext.monthly.profit.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between font-medium">
            <span>Чыгымдар: -{storeContext.monthly.expenses.toLocaleString()} {settings.currency}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
          </div>
        </button>
      </div>

      {/* Main Chat & Reports Body */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col overflow-hidden">
        {/* Quick Reports Bar */}
        <div className="p-3 bg-neutral-50/80 border-b border-neutral-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-bold text-neutral-600 whitespace-nowrap pl-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Ыкчам отчеттор:
          </span>
          <button
            onClick={() => handleGenerateReport('debts')}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/80 flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
          >
            <Users className="w-3.5 h-3.5 text-amber-700" />
            <span>📋 Кимде карыз бар? (Карыздарды эсептөө)</span>
          </button>
          <button
            onClick={() => handleGenerateReport('daily')}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300/80 flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>📊 Күндүк каржылык отчет</span>
          </button>
          <button
            onClick={() => handleGenerateReport('weekly')}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300/80 flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-700" />
            <span>📈 Жумалык соода жана пайда</span>
          </button>
          <button
            onClick={() => handleGenerateReport('monthly')}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300/80 flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
          >
            <CalendarDays className="w-3.5 h-3.5 text-purple-700" />
            <span>🗓️ Айлык толук баланс</span>
          </button>
          <button
            onClick={() =>
              handleSendMessage(
                'Дүкөндүн бардык айлык чыгымдарын (ижара акысы, электр энергиясы, кызматкерлердин айлыгы, салык) так көрсөтүп, дүң пайдадан кемиткенден кийинки ТАЗА КИРЕШЕНИ (НЕТТО ПАЙДАНЫ) эсептеп, каржылык анализ чыгарып бер.'
              )
            }
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300/80 flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
          >
            <Wallet className="w-3.5 h-3.5 text-rose-700" />
            <span>🏢 Чыгымдар жана Таза Киреше (Нетто)</span>
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-neutral-900'
                    : 'bg-gradient-to-br from-emerald-600 to-teal-800'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-neutral-100" />
                ) : (
                  <Bot className="w-5 h-5 text-emerald-100" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`flex-1 rounded-2xl p-4 text-xs md:text-sm leading-relaxed border shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-neutral-900 text-white border-neutral-800'
                    : 'bg-white text-neutral-900 border-neutral-200/90'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100/30 text-[11px] text-neutral-400">
                  <span className="font-bold flex items-center gap-1">
                    {msg.role === 'user' ? 'Администратор' : 'AI Каржылык Жардамчы'}
                    {msg.role === 'model' && msg.usedGemini && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                        Gemini AI
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700 transition"
                      title="Текстти көчүрүү"
                    >
                      {copiedId === msg.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Text Body */}
                <div className="space-y-2 whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-xl mr-auto">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shrink-0 text-white">
                <Bot className="w-5 h-5 text-emerald-100 animate-pulse" />
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-xs font-semibold text-neutral-700">
                  AI базаны эсептеп, каржылык анализ жана отчет даярдоодо...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts & Input Area */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 space-y-2.5 shrink-0">
          {/* Prompt chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50 ${qp.color}`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Text Input & Send */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Админдин суроосу: (мисалы: кимде карыз бар, бүгүнкү пайда канча, кайсы товар лидер?)"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-white border border-neutral-300 rounded-xl text-xs md:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Жөнөтүү</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

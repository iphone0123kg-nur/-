export type UnitType = 'даана' | 'кг' | 'литр' | 'пачка' | 'метр';

export type PaymentMethod = 'cash' | 'card' | 'qr' | 'debt' | 'partial_debt' | 'split';

export interface Product {
  id: string;
  name: string;
  description?: string; // Товардын сүрөттөмөсү / Description
  barcode: string;
  category: string;
  costPrice: number;    // Оптом алынган баасы / Закупка (сом)
  salePrice: number;    // Розница сатуу баасы (сом)
  markupPercent?: number; // Коюлган үстөк пайызы (% Наценка)
  stock: number;        // Калдык саны (Current stock level)
  minStock: number;     // Эскертүү берүү чеги
  unit: UnitType;       // Өлчөө бирдиги
  updatedAt: number;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: string;
  timestamp: number;
}

export type DiscountMode = 'percent' | 'amount';

export interface CartItem {
  product: Product;
  quantity: number;
  discountMode?: DiscountMode;  // 'percent' (%) же 'amount' (сом аркылуу кемитүү)
  discountValue?: number;       // кемитилүүчү маани (% же сом)
  discountPercent: number;      // 0-100% (эсептелген же киргизилген пайыз)
  discountAmount?: number;      // товар боюнча жалпы кемитилген сом
  customPrice?: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  barcode: string;
  category?: string;
  quantity: number;
  unit: UnitType;
  costPrice: number;
  salePrice: number;
  markupPercent?: number;
  discountMode?: DiscountMode;
  discountValue?: number;
  discountPercent: number;
  discountAmount?: number;
  total: number;
}

export interface Sale {
  id: string;              // Чек номери, мисалы: CHK-1042
  timestamp: number;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  cashChange?: number;
  customerName?: string;
  customerPhone?: string;  // Ватсап номери (+996 ...)
  cashierName: string;
  notes?: string;
  status: 'completed' | 'refunded';
  refundTimestamp?: number;
  refundReason?: string;
  // Карыз жана жарым-жартылай төлөм талаалары
  paidNowAmount?: number;     // Төлөнгөн сумма (аванс)
  paidNowMethod?: 'cash' | 'card' | 'qr'; // Кантип төлөнгөнү
  debtAmount?: number;        // Карызга калган суммасы
  debtDueDate?: string;       // Карызды кайтаруу / берүү датасы (YYYY-MM-DD)
  splitPayment?: {
    cashAmount?: number;
    qrAmount?: number;
    cardAmount?: number;
  };
}

export interface DebtPayment {
  id: string;
  timestamp: number;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'qr';
  notes?: string;
  dueDateAtPayment?: string;
  paidEarly?: boolean;
  daysEarly?: number;
}

export interface Debtor {
  id: string;
  name: string;
  phone: string;
  totalDebt: number;
  paidAmount: number;
  balance: number;       // totalDebt - paidAmount
  createdAt: number;
  updatedAt: number;
  dueDate?: string;      // Карызды кайтаруу датасы (Due date)
  saleIds: string[];
  payments: DebtPayment[];
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;         // Ватсап номери
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  cashierName: string;
  receiptFooter: string;
  currency: string;
  taxNumber?: string;    // ИНН / Патент
}

export type ExpenseCategory =
  | 'rent'        // Ижара (Аренда)
  | 'electricity' // Электр энергиясы (Свет)
  | 'salary'      // Кызматкерлердин айлык акысы (Зарплата)
  | 'utilities'   // Башка коммуналдык (Суу, таштанды ж.б.)
  | 'taxes'       // Салык жана патент
  | 'transport'   // Жеткирүү жана транспорт чыгымдары
  | 'marketing'   // Жарнама жана маркетинг
  | 'maintenance' // Чарбалык жана оңдоо чыгымдары
  | 'other';      // Башка чыгымдар

export interface Expense {
  id: string;
  title: string;           // Чыгымдын аталышы (мисалы: "Дүкөндүн айлык ижарасы")
  amount: number;          // Суммасы (сом)
  category: ExpenseCategory; // Категориясы
  date: string;            // Дата (YYYY-MM-DD)
  paymentMethod: 'cash' | 'card' | 'qr'; // Төлөм ыкмасы (Накталай, Карта, MBank/QR)
  paidTo?: string;         // Кимге же кайсы мекемеге төлөндү
  notes?: string;          // Кошумча эскертүү
  createdAt: number;
}


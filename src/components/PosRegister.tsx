import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, CartItem, ShopSettings, Debtor, PaymentMethod, DiscountMode, Customer } from '../types';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  PackageOpen,
  ArrowRight,
  PlusCircle,
  Tag,
  Check,
  Percent,
  Coins,
  ChevronDown,
  ArrowLeft,
  QrCode,
  Banknote,
  BookOpen,
} from 'lucide-react';
import { PaymentModal } from './PaymentModal';

interface PosRegisterProps {
  products: Product[];
  categories: string[];
  settings: ShopSettings;
  debtors: Debtor[];
  customers?: Customer[];
  onCompleteSale: (saleData: {
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
    };
  }) => void;
  onOpenQuickAddProduct: () => void;
}

export const PosRegister: React.FC<PosRegisterProps> = ({
  products,
  categories,
  settings,
  debtors,
  customers = [],
  onCompleteSale,
  onOpenQuickAddProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Бардыгы');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInitialMethod, setPaymentInitialMethod] = useState<PaymentMethod>('qr');
  const [paymentInitialSplitDebt, setPaymentInitialSplitDebt] = useState<boolean>(false);
  const [quickItemModalOpen, setQuickItemModalOpen] = useState(false);
  const [quickItemName, setQuickItemName] = useState('Жеткирүү & Орнотуу');
  const [quickItemPrice, setQuickItemPrice] = useState('500');
  const [confirmClearCart, setConfirmClearCart] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== 'Бардыгы') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [products, selectedCategory, searchTerm]);

  // Add to cart handler
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          discountMode: 'percent',
          discountValue: 0,
          discountPercent: 0,
          discountAmount: 0,
        },
      ];
    });
  };

  // Barcode / Enter key in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = searchTerm.trim();
      if (!trimmed) return;

      // Exact barcode match first
      const exactBarcode = products.find(
        (p) => p.barcode.toLowerCase() === trimmed.toLowerCase()
      );
      if (exactBarcode) {
        handleAddToCart(exactBarcode);
        setSearchTerm('');
        return;
      }

      // If only 1 product matches filter, add it
      if (filteredProducts.length === 1) {
        handleAddToCart(filteredProducts[0]);
        setSearchTerm('');
      }
    }
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleUpdateItemDiscount = (
    productId: string,
    mode: DiscountMode,
    value: number
  ) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const price = item.customPrice ?? item.product.salePrice;
        const lineBaseTotal = price * item.quantity;
        const cleanValue = Math.max(0, isNaN(value) ? 0 : value);

        if (mode === 'amount') {
          const clampedValue = Math.min(lineBaseTotal, cleanValue);
          const calculatedPct =
            lineBaseTotal > 0
              ? Number(((clampedValue / lineBaseTotal) * 100).toFixed(1))
              : 0;
          return {
            ...item,
            discountMode: 'amount',
            discountValue: clampedValue,
            discountAmount: clampedValue,
            discountPercent: calculatedPct,
          };
        } else {
          // percent mode
          const clampedPct = Math.min(100, cleanValue);
          const calculatedAmount = Math.round((lineBaseTotal * clampedPct) / 100);
          return {
            ...item,
            discountMode: 'percent',
            discountValue: clampedPct,
            discountAmount: calculatedAmount,
            discountPercent: clampedPct,
          };
        }
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setOverallDiscountPercent(0);
    setConfirmClearCart(false);
  };

  // Add free custom item
  const handleAddQuickCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(quickItemPrice) || 0;
    if (price <= 0 || !quickItemName.trim()) return;

    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name: quickItemName.trim(),
      barcode: '',
      category: 'Башка',
      costPrice: 0,
      salePrice: price,
      stock: 9999,
      minStock: 0,
      unit: 'даана',
      updatedAt: Date.now(),
    };

    setCart((prev) => [
      ...prev,
      {
        product: customProduct,
        quantity: 1,
        discountMode: 'percent',
        discountValue: 0,
        discountPercent: 0,
        discountAmount: 0,
      },
    ]);
    setQuickItemModalOpen(false);
    setQuickItemName('Пакет чоң');
    setQuickItemPrice('5');
  };

  // Helper to compute discount for a specific cart item
  const getItemDiscountDetails = (item: CartItem) => {
    const price = item.customPrice ?? item.product.salePrice;
    const baseTotal = price * item.quantity;
    let discountSom = 0;
    let effectivePercent = 0;

    if (item.discountMode === 'amount') {
      discountSom = Math.min(baseTotal, Math.max(0, item.discountValue || 0));
      effectivePercent = baseTotal > 0 ? Number(((discountSom / baseTotal) * 100).toFixed(1)) : 0;
    } else {
      effectivePercent = Math.min(
        100,
        Math.max(0, item.discountValue !== undefined ? item.discountValue : item.discountPercent || 0)
      );
      discountSom = Math.round((baseTotal * effectivePercent) / 100);
    }

    const finalTotal = Math.max(0, baseTotal - discountSom);
    return {
      baseTotal,
      discountSom,
      effectivePercent,
      finalTotal,
    };
  };

  // Calculation of totals
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const { finalTotal } = getItemDiscountDetails(item);
      return acc + finalTotal;
    }, 0);
  }, [cart]);

  // Total raw catalog price before any item discounts
  const rawCatalogTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.customPrice ?? item.product.salePrice;
      return acc + price * item.quantity;
    }, 0);
  }, [cart]);

  // Sum of all individual item discounts
  const totalItemDiscounts = useMemo(() => {
    return cart.reduce((acc, item) => {
      const { discountSom } = getItemDiscountDetails(item);
      return acc + discountSom;
    }, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * overallDiscountPercent) / 100);
  }, [subtotal, overallDiscountPercent]);

  const total = Math.max(0, subtotal - discountAmount);
  const totalItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const handleCheckoutConfirmed = (paymentData: {
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
  }) => {
    onCompleteSale({
      cart,
      subtotal,
      discountAmount,
      total,
      paymentData,
    });
    setCart([]);
    setOverallDiscountPercent(0);
    setIsPaymentModalOpen(false);
    searchInputRef.current?.focus();
  };

  return (
    <div id="pos-register-view" className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-neutral-100">
      {/* Mobile / Small Tablet View Switcher (< lg) */}
      <div className="lg:hidden bg-white border-b border-neutral-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex bg-neutral-100 p-1 rounded-xl w-full">
          <button
            id="mobile-tab-catalog-btn"
            type="button"
            onClick={() => setMobileView('catalog')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileView === 'catalog'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Товарлар каталогу</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-700">
              {filteredProducts.length}
            </span>
          </button>
          <button
            id="mobile-tab-cart-btn"
            type="button"
            onClick={() => setMobileView('cart')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileView === 'cart'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Себет / Чек</span>
            {totalItemCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  mobileView === 'cart' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {totalItemCount} ({total.toLocaleString()} {settings.currency})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LEFT SECTION: Search, Categories, Products Grid */}
      <div
        className={`flex-1 flex flex-col h-full min-w-0 overflow-hidden border-r border-neutral-200 ${
          mobileView === 'catalog' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Top Bar: Barcode / Name search & Quick actions */}
        <div className="p-4 bg-white border-b border-neutral-200 shadow-2xs space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-3 text-neutral-400" />
              <input
                id="pos-product-search-input"
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Товардын аталышы же штрих-код боюнча издөө (Enter - себетке салуу)..."
                className="w-full pl-11 pr-24 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-neutral-50 focus:bg-white text-sm transition"
              />
              <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-200/80 px-2 py-0.5 rounded-md font-mono">
                <Barcode className="w-3.5 h-3.5" />
                <span>Штрих-код</span>
              </div>
            </div>

            <button
              id="open-quick-item-btn"
              type="button"
              onClick={() => setQuickItemModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              title="Каталогдо жок товар же пакет кошуу"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Эркин товар</span>
            </button>

            <button
              id="open-add-new-product-btn"
              type="button"
              onClick={onOpenQuickAddProduct}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Жаңы товар</span>
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => {
              const count =
                cat === 'Бардыгы'
                  ? products.length
                  : products.filter((p) => p.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-neutral-300">
              <PackageOpen className="w-12 h-12 text-neutral-400 mb-2" />
              <h4 className="text-base font-semibold text-neutral-700">Мындай товар табылган жок</h4>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                Издөө сөзүн өзгөртүңүз же &ldquo;Жаңы товар&rdquo; баскычы аркылуу товарга базага киргизиңиз.
              </p>
              <button
                onClick={onOpenQuickAddProduct}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Жаңы товар кошуу
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => {
                const inCartItem = cart.find((i) => i.product.id === product.id);
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;

                return (
                  <button
                    key={product.id}
                    id={`pos-product-${product.id}`}
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className={`relative flex flex-col justify-between text-left p-3 rounded-xl bg-white border transition duration-150 active:scale-97 group ${
                      inCartItem
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 hover:shadow-xs'
                    }`}
                  >
                    {/* In cart badge */}
                    {inCartItem && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                        {inCartItem.quantity}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                        <span className="truncate pr-1">{product.category}</span>
                        {product.unit && (
                          <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] text-neutral-600 font-mono">
                            {product.unit}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-800 line-clamp-2 leading-tight group-hover:text-emerald-700 transition">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-end justify-between">
                      <div>
                        <div className="text-base sm:text-lg font-bold text-neutral-900 leading-none">
                          {product.salePrice}{' '}
                          <span className="text-xs font-normal text-neutral-500">
                            {settings.currency}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-1">
                          Наркы: {product.costPrice} {settings.currency}
                        </div>
                      </div>

                      {/* Stock pill */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-700'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {isOutOfStock
                          ? 'Түгөндү'
                          : `${product.stock} ${product.unit}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Quick Checkout Bar (Visible in catalog view on phone when items are added) */}
        {cart.length > 0 && (
          <div
            id="mobile-cart-summary-bar"
            className="lg:hidden p-3 bg-white border-t border-neutral-200 shadow-xl flex items-center justify-between gap-3 shrink-0"
          >
            <div>
              <span className="text-[11px] text-neutral-500 font-medium block">
                {totalItemCount} даана товар себетте
              </span>
              <span className="text-base font-black text-neutral-900">
                {total.toLocaleString()} {settings.currency}
              </span>
            </div>
            <button
              id="mobile-open-cart-action-btn"
              type="button"
              onClick={() => setMobileView('cart')}
              className="px-4 py-2.5 bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Чекке өтүү ({totalItemCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Cart / Cashier Slip */}
      <div
        className={`w-full lg:w-96 xl:w-[420px] bg-white flex flex-col h-full shrink-0 shadow-lg border-l border-neutral-200 ${
          mobileView === 'cart' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Cart Header */}
        <div className="p-3 sm:p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileView('catalog')}
              className="lg:hidden p-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-700 transition"
              title="Каталогго кайтуу"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Сатуу чеги</h3>
              <p className="text-[11px] text-neutral-500">
                {totalItemCount} позиция себетте
              </p>
            </div>
          </div>

          {cart.length > 0 && (
            confirmClearCart ? (
              <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200">
                <span className="text-[10px] text-red-700 font-semibold px-1">Тазалансынбы?</span>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition"
                >
                  Ооба
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearCart(false)}
                  className="px-1.5 py-0.5 bg-white text-neutral-600 hover:bg-neutral-100 rounded text-[10px] border border-neutral-200 transition"
                >
                  Жок
                </button>
              </div>
            ) : (
              <button
                id="clear-cart-btn"
                type="button"
                onClick={() => setConfirmClearCart(true)}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Тазалоо</span>
              </button>
            )
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <ShoppingCart className="w-12 h-12 text-neutral-300 stroke-1 mb-2" />
              <p className="text-sm font-medium text-neutral-600">Себет азырынча бош</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                Сол жактан товарды басыңыз же штрих-кодду сканерлеңиз
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const itemPrice = item.customPrice ?? item.product.salePrice;
              const { baseTotal, discountSom, effectivePercent, finalTotal } = getItemDiscountDetails(item);
              const currentMode: DiscountMode = item.discountMode || (item.discountPercent > 0 ? 'percent' : 'percent');
              const currentValue = item.discountValue !== undefined ? item.discountValue : (item.discountPercent || 0);

              return (
                <div
                  key={item.product.id}
                  id={`cart-item-${item.product.id}`}
                  className="p-3 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition space-y-2.5 shadow-2xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-semibold text-neutral-800 line-clamp-1">
                        {item.product.name}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                        <span>
                          {itemPrice.toLocaleString()} {settings.currency} / {item.product.unit}
                        </span>
                        {item.product.barcode && (
                          <span className="font-mono text-[10px] text-neutral-400">
                            · {item.product.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-neutral-400 hover:text-red-600 p-1 rounded-md hover:bg-neutral-100 transition shrink-0"
                      title="Өчүрүү"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity and Line Total */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(
                            item.product.id,
                            Math.max(1, parseFloat(e.target.value) || 1)
                          )
                        }
                        className="w-12 text-center text-xs font-bold text-neutral-900 bg-white border-x border-neutral-200 py-1 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      {discountSom > 0 && (
                        <div className="text-[10px] text-neutral-400 line-through">
                          {baseTotal.toLocaleString()} {settings.currency}
                        </div>
                      )}
                      <span className="text-sm font-bold text-neutral-900">
                        {finalTotal.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Per-Item Discount Controls: % жана сом кемитүү */}
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-1.5 bg-neutral-50/70 p-2 rounded-lg">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-neutral-500 mr-0.5">
                        Кемитүү:
                      </span>
                      {/* Mode Switcher (% же Сом) */}
                      <div className="flex rounded-md bg-neutral-200/80 p-0.5 text-[10px] font-semibold">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemDiscount(item.product.id, 'percent', currentValue)}
                          className={`px-1.5 py-0.5 rounded transition flex items-center gap-0.5 ${
                            currentMode === 'percent'
                              ? 'bg-white text-neutral-900 shadow-2xs'
                              : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                          title="Пайыз менен кемитүү (%)"
                        >
                          <Percent className="w-2.5 h-2.5" />
                          <span>%</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemDiscount(item.product.id, 'amount', currentValue)}
                          className={`px-1.5 py-0.5 rounded transition flex items-center gap-0.5 ${
                            currentMode === 'amount'
                              ? 'bg-white text-neutral-900 shadow-2xs'
                              : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                          title="Сом менен кемитүү"
                        >
                          <Coins className="w-2.5 h-2.5" />
                          <span>{settings.currency}</span>
                        </button>
                      </div>

                      {/* Discount input field */}
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max={currentMode === 'percent' ? 100 : baseTotal}
                          step={currentMode === 'percent' ? '1' : '10'}
                          value={currentValue === 0 ? '' : currentValue}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateItemDiscount(item.product.id, currentMode, val);
                          }}
                          className="w-16 px-1.5 py-0.5 text-center text-xs font-semibold bg-white border border-neutral-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <span className="ml-1 text-[11px] font-semibold text-neutral-600">
                          {currentMode === 'percent' ? '%' : settings.currency}
                        </span>
                      </div>
                    </div>

                    {/* Quick discount chips or calculated discount label */}
                    <div className="flex items-center gap-1">
                      {discountSom > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            -{discountSom.toLocaleString()} {settings.currency}
                            {currentMode === 'amount' && ` (${effectivePercent}%)`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemDiscount(item.product.id, 'percent', 0)}
                            className="text-[10px] text-neutral-400 hover:text-red-500 underline"
                            title="Кемитүүнү алып салуу"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          {[3, 5, 10].map((presetPct) => (
                            <button
                              key={presetPct}
                              type="button"
                              onClick={() => handleUpdateItemDiscount(item.product.id, 'percent', presetPct)}
                              className="text-[10px] font-medium text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 px-1.5 py-0.5 rounded transition"
                            >
                              -{presetPct}%
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Bottom Summary & Checkout */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-3">
          {/* Quick overall discount chips */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-medium flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-neutral-400" />
              Жалпы чекке арзандатуу:
            </span>
            <div className="flex gap-1">
              {[0, 3, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setOverallDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    overallDiscountPercent === pct
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {pct === 0 ? 'Жок' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Subtotal & Discount rows */}
          <div className="space-y-1 text-xs text-neutral-600 border-t border-neutral-200 pt-2">
            <div className="flex justify-between">
              <span>Товарлардын баштапкы баасы:</span>
              <span className="font-semibold text-neutral-800">
                {rawCatalogTotal.toLocaleString()} {settings.currency}
              </span>
            </div>
            {totalItemDiscounts > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Товарлардан кемитилди:</span>
                <span className="font-semibold">-{totalItemDiscounts.toLocaleString()} {settings.currency}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Жалпы арзандатуу ({overallDiscountPercent}%):</span>
                <span>-{discountAmount.toLocaleString()} {settings.currency}</span>
              </div>
            )}
          </div>

          {/* Big Total */}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-sm font-semibold text-neutral-700">ТӨЛӨӨГӨ:</span>
            <div className="text-right">
              <span className="text-3xl font-black text-neutral-950">
                {total.toLocaleString()}
              </span>{' '}
              <span className="text-sm font-bold text-neutral-600">{settings.currency}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            id="open-payment-modal-btn"
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              setPaymentInitialMethod('qr');
              setPaymentInitialSplitDebt(false);
              setIsPaymentModalOpen(true);
            }}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition shadow-md ${
              cart.length === 0
                ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 cursor-pointer'
            }`}
          >
            <span>ТӨЛӨМ КАБЫЛ АЛУУ</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Quick Payment & Partial Debt Direct Action Buttons */}
          {cart.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                id="fast-qr-checkout-btn"
                onClick={() => {
                  setPaymentInitialMethod('qr');
                  setPaymentInitialSplitDebt(false);
                  setIsPaymentModalOpen(true);
                }}
                className="py-2 px-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
              >
                <QrCode className="w-3.5 h-3.5 text-purple-600" />
                <span>Мбанк QR</span>
              </button>

              <button
                type="button"
                id="fast-cash-checkout-btn"
                onClick={() => {
                  setPaymentInitialMethod('cash');
                  setPaymentInitialSplitDebt(false);
                  setIsPaymentModalOpen(true);
                }}
                className="py-2 px-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Накталай</span>
              </button>

              <button
                type="button"
                id="fast-debt-checkout-btn"
                onClick={() => {
                  setPaymentInitialMethod('qr');
                  setPaymentInitialSplitDebt(true);
                  setIsPaymentModalOpen(true);
                }}
                className="py-2 px-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>⚡ Карыз + QR</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          total={total}
          currency={settings.currency}
          debtors={debtors}
          customers={customers}
          initialMethod={paymentInitialMethod}
          initialSplitDebt={paymentInitialSplitDebt}
          onConfirm={handleCheckoutConfirmed}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* Quick Custom Item Modal */}
      {quickItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200">
            <h4 className="text-base font-bold text-neutral-900 mb-1">Эркин товар кошуу</h4>
            <p className="text-xs text-neutral-500 mb-4">
              Каталогдо жок товарды же пакетти себетке тез кошуңуз.
            </p>
            <form onSubmit={handleAddQuickCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Аталышы:
                </label>
                <input
                  type="text"
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Баасы ({settings.currency}):
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickItemPrice}
                  onChange={(e) => setQuickItemPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickItemModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                >
                  Жокко чыгаруу
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Себетке кошуу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

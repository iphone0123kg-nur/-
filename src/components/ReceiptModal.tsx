import React, { useState, useEffect } from 'react';
import { Sale, ShopSettings } from '../types';
import {
  Printer,
  X,
  CheckCircle2,
  MessageCircle,
  Send,
  Copy,
  Check,
  Phone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  buildWhatsAppReceiptText,
  cleanPhoneForWhatsApp,
  getWhatsAppShareUrl,
  sendReceiptViaWhatsApp,
} from '../utils/whatsappReceipt';

interface ReceiptModalProps {
  sale: Sale | null;
  settings: ShopSettings;
  onClose: () => void;
  onNewSale?: () => void;
  defaultPhone?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  settings,
  onClose,
  onNewSale,
  defaultPhone,
}) => {
  if (!sale) return null;

  const [whatsappPhone, setWhatsappPhone] = useState(sale.customerPhone || defaultPhone || '');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setWhatsappPhone(sale.customerPhone || defaultPhone || '');
    setCopied(false);
    setShowPreview(false);
  }, [sale.id, sale.customerPhone, defaultPhone]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    sendReceiptViaWhatsApp(sale, settings, whatsappPhone);
  };

  const handleCopyText = async () => {
    const text = buildWhatsAppReceiptText(sale, settings);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const formattedReceiptText = buildWhatsAppReceiptText(sale, settings);
  const cleanPhone = cleanPhoneForWhatsApp(whatsappPhone);

  const getPaymentName = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Накталай';
      case 'card':
        return 'Банк картасы (POS)';
      case 'qr':
        return 'MBank / QR которуу';
      case 'debt':
        return 'Карызга (Насия)';
      case 'partial_debt':
        return 'Жарым төлөм + Карыз';
      case 'split':
        return 'Аралаш төлөм (Накталай + Мбанк QR)';
      default:
        return method;
    }
  };

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="receipt-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden my-auto border border-neutral-200 max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-emerald-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-100 shrink-0" />
            <div>
              <h3 className="font-semibold text-base sm:text-lg">Сатуу ийгиликтүү аяктады!</h3>
              <p className="text-xs text-emerald-100">Чек: #{sale.id}</p>
            </div>
          </div>
          <button
            id="close-receipt-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-emerald-700/60 text-white/90 hover:text-white transition"
            aria-label="Жабуу"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Preview */}
        <div className="p-3 sm:p-6 bg-neutral-100 overflow-y-auto flex-1 min-h-[180px] max-h-[45vh] flex justify-center">
          <div
            id="printable-receipt"
            className="bg-white p-6 shadow-md rounded-lg w-full max-w-xs text-neutral-800 text-xs font-mono border border-dashed border-neutral-300"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-neutral-400">
              <h2 className="text-base font-bold uppercase tracking-wider text-black">
                {settings.shopName}
              </h2>
              {settings.tagline && (
                <p className="text-[11px] text-neutral-600 mt-0.5">{settings.tagline}</p>
              )}
              {settings.address && (
                <p className="text-[11px] text-neutral-600 mt-0.5">{settings.address}</p>
              )}
              {settings.phone && (
                <p className="text-[11px] text-neutral-600 mt-0.5">Тел: {settings.phone}</p>
              )}
              {settings.taxNumber && (
                <p className="text-[10px] text-neutral-500 mt-0.5">ИНН: {settings.taxNumber}</p>
              )}
            </div>

            {/* Meta */}
            <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Чек №:</span>
                <span className="font-bold">{sale.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Убактысы:</span>
                <span>{new Date(sale.timestamp).toLocaleString('ru-RU')}</span>
              </div>
              <div className="flex justify-between">
                <span>Кассир:</span>
                <span>{sale.cashierName || settings.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between text-neutral-900 font-bold">
                  <span>Кардар:</span>
                  <span>{sale.customerName}</span>
                </div>
              )}
              {sale.customerPhone && (
                <div className="flex justify-between text-emerald-800 font-semibold text-[11px]">
                  <span>Ватсап:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-3 border-b border-dashed border-neutral-400">
              <div className="flex justify-between text-[11px] font-bold pb-1 text-neutral-700">
                <span>Товар</span>
                <span>Суммасы</span>
              </div>
              <div className="space-y-2 mt-1">
                {sale.items.map((item, idx) => {
                  let discountBadge = '';
                  if (item.discountMode === 'amount' && (item.discountValue || 0) > 0) {
                    discountBadge = ` (-${item.discountValue} ${settings.currency})`;
                  } else if (item.discountPercent > 0) {
                    discountBadge = ` (-${item.discountPercent}%)`;
                  } else if (item.discountAmount && item.discountAmount > 0) {
                    discountBadge = ` (-${item.discountAmount} ${settings.currency})`;
                  }

                  return (
                    <div key={idx} className="leading-tight">
                      <div className="font-medium text-neutral-900">{item.name}</div>
                      <div className="flex justify-between text-[11px] text-neutral-600">
                        <span>
                          {item.quantity} {item.unit} × {item.salePrice} {settings.currency}
                          {discountBadge && <span className="text-red-600 font-semibold">{discountBadge}</span>}
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {item.total} {settings.currency}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            {(() => {
              const itemDiscountsSum = sale.items.reduce((acc, it) => acc + (it.discountAmount || 0), 0);
              const totalAllDiscounts = itemDiscountsSum + (sale.discountAmount || 0);
              const originalCatalogSum = sale.total + totalAllDiscounts;

              return (
                <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1">
                  {totalAllDiscounts > 0 && (
                    <div className="flex justify-between text-neutral-600">
                      <span>Каталог боюнча наркы:</span>
                      <span>{originalCatalogSum.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  {itemDiscountsSum > 0 && (
                    <div className="flex justify-between text-red-600 text-[11px]">
                      <span>Товарлардан кемитилген:</span>
                      <span>-{itemDiscountsSum.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  {sale.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600 text-[11px]">
                      <span>Чектин жалпы арзандатуусу:</span>
                      <span>-{sale.discountAmount.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 text-neutral-950">
                    <span>ЖАЛПЫ ТӨЛӨӨ:</span>
                    <span>{sale.total.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              );
            })()}

            {/* Payment Info */}
            <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Төлөм түрү:</span>
                <span className="font-bold">{getPaymentName(sale.paymentMethod)}</span>
              </div>
              {sale.paymentMethod === 'cash' && sale.cashReceived !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span>Алынган накталай:</span>
                    <span>{sale.cashReceived} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Кайтарым (сдача):</span>
                    <span>{sale.cashChange || 0} {settings.currency}</span>
                  </div>
                </>
              )}
              {sale.paymentMethod === 'split' && sale.splitPayment && (
                <div className="space-y-1 text-[11px] pt-1 border-t border-dashed border-neutral-300">
                  {sale.splitPayment.cashAmount !== undefined && sale.splitPayment.cashAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Накталай төлөндү:</span>
                      <span className="font-bold">{sale.splitPayment.cashAmount.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  {sale.splitPayment.qrAmount !== undefined && sale.splitPayment.qrAmount > 0 && (
                    <div className="flex justify-between text-purple-700">
                      <span>Мбанк QR менен төлөндү:</span>
                      <span className="font-bold">{sale.splitPayment.qrAmount.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  {sale.splitPayment.cardAmount !== undefined && sale.splitPayment.cardAmount > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>Карта менен төлөндү:</span>
                      <span className="font-bold">{sale.splitPayment.cardAmount.toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                </div>
              )}
              {(sale.paymentMethod === 'debt' || sale.paymentMethod === 'partial_debt') && (
                <>
                  {(sale.paidNowAmount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>
                        Бүгүн төлөнгөнү ({sale.paidNowMethod === 'cash' ? 'Накталай' : sale.paidNowMethod === 'card' ? 'Карта' : 'Мбанк QR'}):
                      </span>
                      <span>{(sale.paidNowAmount || 0).toLocaleString()} {settings.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>Карызга жазылганы:</span>
                    <span>
                      {(sale.debtAmount !== undefined
                        ? sale.debtAmount
                        : sale.total - (sale.paidNowAmount || 0)
                      ).toLocaleString()}{' '}
                      {settings.currency}
                    </span>
                  </div>
                  {sale.debtDueDate && (
                    <div className="flex justify-between text-red-700 font-semibold text-[11px]">
                      <span>Кайтаруу мөөнөтү:</span>
                      <span>{sale.debtDueDate}</span>
                    </div>
                  )}
                </>
              )}
              {sale.notes && (
                <div className="pt-1 text-[10px] text-neutral-500 italic">
                  Эскертүү: {sale.notes}
                </div>
              )}
              {sale.status === 'refunded' && (
                <div className="mt-2 text-center py-1 bg-red-100 text-red-700 font-bold uppercase rounded">
                  *** КАЙТАРЫЛДЫ (ВОЗВРАТ) ***
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[11px] text-neutral-600">
              <p>{settings.receiptFooter}</p>
              <p className="mt-1 text-[10px] text-neutral-400">ПОС Касса системасы</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Sharing Section */}
        <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <span>Кардарга WhatsApp аркылуу чек жөнөтүү</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-medium"
              >
                {showPreview ? (
                  <>
                    <span>Жашыруу</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Текстти көрүү</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Recipient Phone Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="Ватсап тел: 0700 123456 же бош калтырыңыз"
                  className="w-full pl-8 pr-7 py-2 bg-white text-xs text-neutral-800 rounded-lg border border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                />
                {whatsappPhone && (
                  <button
                    type="button"
                    onClick={() => setWhatsappPhone('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  id="send-whatsapp-btn"
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp'ка жиберүү</span>
                </button>

                <button
                  id="copy-receipt-text-btn"
                  type="button"
                  onClick={handleCopyText}
                  title="Чектин текстин көчүрүп алуу"
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition ${
                    copied
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                      : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Көчүрүлдү!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Көчүрүү</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Recipient status hint */}
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span>
                {cleanPhone ? (
                  <span className="text-emerald-700 font-medium">
                    Номери: +{cleanPhone} түз чатына ачылат
                  </span>
                ) : (
                  <span>Номери жок болсо — WhatsApp контакты тандоо терезеси ачылат</span>
                )}
              </span>
              {copied && <span className="text-emerald-700 font-bold">Буферге көчүрүлдү!</span>}
            </div>

            {/* Formatted Text Preview if toggled */}
            {showPreview && (
              <div className="mt-2 p-3 bg-neutral-900 text-emerald-300 rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-neutral-800 shadow-inner">
                {formattedReceiptText}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-neutral-200 flex flex-col sm:flex-row gap-2">
          <button
            id="quick-whatsapp-action-btn"
            onClick={handleSendWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition active:scale-98"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp чеги</span>
          </button>
          <button
            id="print-receipt-action-btn"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Печать</span>
          </button>
          <button
            id="continue-sale-btn"
            onClick={() => {
              if (onNewSale) onNewSale();
              onClose();
            }}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 font-medium hover:bg-neutral-200 transition active:scale-98 text-center"
          >
            Жаңы соода
          </button>
        </div>
      </div>
    </div>
  );
};

import { Sale, ShopSettings } from '../types';

/**
 * Normalizes phone numbers to international digits for WhatsApp.
 * Supports Kyrgyz national formats:
 * - 0700 12 34 56 -> 996700123456
 * - +996 700 123456 -> 996700123456
 * - 700123456 -> 996700123456
 */
export const cleanPhoneForWhatsApp = (rawPhone?: string): string => {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/[^\d]/g, '');
  if (!digits) return '';

  // Local Kyrgyz format starting with 0 (e.g., 0700 123456 or 0555 123456)
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '996' + digits.slice(1);
  } else if (
    digits.length === 9 &&
    (digits.startsWith('7') ||
      digits.startsWith('5') ||
      digits.startsWith('9') ||
      digits.startsWith('2') ||
      digits.startsWith('3'))
  ) {
    digits = '996' + digits;
  }

  return digits;
};

/**
 * Formats a clean, professional, readable WhatsApp receipt message in Kyrgyz
 * with bolding, itemized list, discounts, debt information, and store contacts.
 */
export const buildWhatsAppReceiptText = (sale: Sale, settings: ShopSettings): string => {
  const lines: string[] = [];

  // Header / Shop Info
  lines.push(`🧾 *${settings.shopName.toUpperCase()}*`);
  if (settings.tagline) lines.push(`_${settings.tagline}_`);
  if (settings.address) lines.push(`📍 Дареги: ${settings.address}`);
  if (settings.phone) lines.push(`📞 Байланыш: ${settings.phone}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  // Receipt metadata
  lines.push(`📄 *Чек №:* ${sale.id}`);
  lines.push(`📅 *Убактысы:* ${new Date(sale.timestamp).toLocaleString('ru-RU')}`);
  lines.push(`👤 *Кассир:* ${sale.cashierName || settings.cashierName}`);
  if (sale.customerName) {
    lines.push(`🤝 *Кардар:* ${sale.customerName}`);
  }
  if (sale.customerPhone) {
    lines.push(`📱 *Ватсап:* ${sale.customerPhone}`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  // Items
  lines.push(`📦 *САТЫП АЛЫНГАН ТОВАРЛАР:*`);
  sale.items.forEach((item, index) => {
    lines.push(`${index + 1}. *${item.name}*`);

    let itemCalc = `   ${item.quantity} ${item.unit || 'даана'} × ${item.salePrice.toLocaleString()} ${settings.currency}`;
    if (item.discountAmount && item.discountAmount > 0) {
      itemCalc += ` (-${item.discountAmount.toLocaleString()} ${settings.currency})`;
    }
    itemCalc += ` = *${item.total.toLocaleString()} ${settings.currency}*`;
    lines.push(itemCalc);
  });
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  // Discounts breakdown
  const itemDiscountsSum = sale.items.reduce((acc, it) => acc + (it.discountAmount || 0), 0);
  const totalAllDiscounts = itemDiscountsSum + (sale.discountAmount || 0);
  const originalCatalogSum = sale.total + totalAllDiscounts;

  if (totalAllDiscounts > 0) {
    lines.push(`🏷️ Каталог боюнча: ${originalCatalogSum.toLocaleString()} ${settings.currency}`);
  }
  if (itemDiscountsSum > 0) {
    lines.push(`✂️ Товарлардан кемитилген: -${itemDiscountsSum.toLocaleString()} ${settings.currency}`);
  }
  if (sale.discountAmount > 0) {
    lines.push(`✂️ Чек боюнча жалпы арзандатуу: -${sale.discountAmount.toLocaleString()} ${settings.currency}`);
  }

  // Grand Total
  lines.push(`💰 *ЖАЛПЫ ТӨЛӨӨ: ${sale.total.toLocaleString()} ${settings.currency}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  // Payment Breakdown
  let paymentText = '';
  switch (sale.paymentMethod) {
    case 'cash':
      paymentText = 'Накталай';
      break;
    case 'card':
      paymentText = 'Банк картасы (POS)';
      break;
    case 'qr':
      paymentText = 'MBank / QR которуу';
      break;
    case 'debt':
      paymentText = 'Карызга (Насия)';
      break;
    case 'partial_debt':
      paymentText = 'Жарым төлөм + Карыз';
      break;
    case 'split':
      paymentText = 'Аралаш төлөм (Накталай + Мбанк QR)';
      break;
    default:
      paymentText = sale.paymentMethod;
  }
  lines.push(`💳 *Төлөм түрү:* ${paymentText}`);

  if (sale.paymentMethod === 'split' && sale.splitPayment) {
    if (sale.splitPayment.cashAmount) {
      lines.push(`💵 Накталай төлөндү: ${sale.splitPayment.cashAmount.toLocaleString()} ${settings.currency}`);
    }
    if (sale.splitPayment.qrAmount) {
      lines.push(`📱 Мбанк QR менен төлөндү: ${sale.splitPayment.qrAmount.toLocaleString()} ${settings.currency}`);
    }
    if (sale.splitPayment.cardAmount) {
      lines.push(`💳 Карта менен төлөндү: ${sale.splitPayment.cardAmount.toLocaleString()} ${settings.currency}`);
    }
  }

  if (sale.paymentMethod === 'cash' && sale.cashReceived !== undefined) {
    lines.push(`💵 Берилген акча: ${sale.cashReceived.toLocaleString()} ${settings.currency}`);
    lines.push(`🪙 Кайтарым (сдача): ${(sale.cashChange || 0).toLocaleString()} ${settings.currency}`);
  }

  if (sale.paymentMethod === 'debt' || sale.paymentMethod === 'partial_debt') {
    if ((sale.paidNowAmount || 0) > 0) {
      const pMethod =
        sale.paidNowMethod === 'cash'
          ? 'Накталай'
          : sale.paidNowMethod === 'card'
          ? 'Карта'
          : 'Мбанк QR';
      lines.push(
        `✅ Бүгүн төлөнгөнү (${pMethod}): ${(sale.paidNowAmount || 0).toLocaleString()} ${settings.currency}`
      );
    }
    const debtSum =
      sale.debtAmount !== undefined
        ? sale.debtAmount
        : sale.total - (sale.paidNowAmount || 0);
    lines.push(
      `⚠️ *Карызга жазылган сумма:* *${debtSum.toLocaleString()} ${settings.currency}*`
    );
    if (sale.debtDueDate) {
      lines.push(`🗓️ *Кайтаруу мөөнөтү:* ${sale.debtDueDate}`);
    }
  }

  if (sale.notes) {
    lines.push(`📝 Эскертүү: ${sale.notes}`);
  }

  if (sale.status === 'refunded') {
    lines.push(`⚠️ *БУЛ ЧЕК КАЙТАРЫЛГАН (ВОЗВРАТ)*`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  if (settings.receiptFooter) {
    lines.push(`✨ ${settings.receiptFooter}`);
  } else {
    lines.push(`🙏 Соодаңыз үчүн чоң рахмат! Дүкөнүбүзгө дагы келиңиз!`);
  }

  return lines.join('\n');
};

/**
 * Returns the direct WhatsApp link to send the receipt.
 * If phone number is supplied, targets that recipient directly.
 * Otherwise, opens WhatsApp contact/chat picker.
 */
export const getWhatsAppShareUrl = (
  sale: Sale,
  settings: ShopSettings,
  phoneOverride?: string
): string => {
  const text = buildWhatsAppReceiptText(sale, settings);
  const cleanPhone = cleanPhoneForWhatsApp(phoneOverride || sale.customerPhone || '');
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
};

/**
 * Opens WhatsApp in a new tab with the ready-to-send formatted receipt.
 */
export const sendReceiptViaWhatsApp = (
  sale: Sale,
  settings: ShopSettings,
  phoneOverride?: string
): void => {
  const url = getWhatsAppShareUrl(sale, settings, phoneOverride);
  window.open(url, '_blank', 'noopener,noreferrer');
};

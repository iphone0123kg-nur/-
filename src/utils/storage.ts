import { Product, Sale, ShopSettings, Debtor, StockAdjustment, Customer, Expense } from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_SETTINGS,
  INITIAL_DEBTORS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'clean_pos_products_v1',
  SALES: 'clean_pos_sales_v1',
  SETTINGS: 'clean_pos_settings_v1',
  DEBTORS: 'clean_pos_debtors_v1',
  CATEGORIES: 'clean_pos_categories_v1',
  ADJUSTMENTS: 'clean_pos_adjustments_v1',
  CUSTOMERS: 'clean_pos_customers_v1',
  EXPENSES: 'clean_pos_expenses_v1',
};

// Purge legacy demo keys so the browser immediately starts with a fresh empty state
try {
  const legacyKeys = [
    'pos_appliances_products_v2',
    'pos_appliances_sales_v2',
    'pos_appliances_settings_v2',
    'pos_appliances_debtors_v2',
    'pos_appliances_categories_v2',
    'pos_appliances_adjustments_v2',
    'pos_appliances_customers_v2',
    'pos_appliances_expenses_v2',
    'pos_appliances_products_v1',
    'pos_appliances_sales_v1',
    'pos_appliances_settings_v1',
  ];
  legacyKeys.forEach((key) => {
    localStorage.removeItem(key);
  });
} catch (e) {
  console.warn('Could not clear legacy storage keys', e);
}

export const getStoredAdjustments = (): StockAdjustment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading adjustments:', e);
    return [];
  }
};

export const saveStoredAdjustments = (adjustments: StockAdjustment[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments));
  } catch (e) {
    console.error('Error saving adjustments:', e);
  }
};

export const getStoredProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading products from storage:', e);
    return INITIAL_PRODUCTS;
  }
};

export const saveStoredProducts = (products: Product[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving products to storage:', e);
  }
};

export const getStoredSales = (): Sale[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
      return INITIAL_SALES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading sales from storage:', e);
    return INITIAL_SALES;
  }
};

export const saveStoredSales = (sales: Sale[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (e) {
    console.error('Error saving sales to storage:', e);
  }
};

export const getStoredDebtors = (): Debtor[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEBTORS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DEBTORS, JSON.stringify(INITIAL_DEBTORS));
      return INITIAL_DEBTORS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading debtors from storage:', e);
    return INITIAL_DEBTORS;
  }
};

export const saveStoredDebtors = (debtors: Debtor[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DEBTORS, JSON.stringify(debtors));
  } catch (e) {
    console.error('Error saving debtors to storage:', e);
  }
};

export const getStoredSettings = (): ShopSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading settings from storage:', e);
    return INITIAL_SETTINGS;
  }
};

export const saveStoredSettings = (settings: ShopSettings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to storage:', e);
  }
};

export const getStoredCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading categories from storage:', e);
    return INITIAL_CATEGORIES;
  }
};

export const saveStoredCategories = (categories: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving categories to storage:', e);
  }
};

export const getStoredCustomers = (): Customer[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading customers from storage:', e);
    return INITIAL_CUSTOMERS;
  }
};

export const saveStoredCustomers = (customers: Customer[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers to storage:', e);
  }
};

export const getStoredExpenses = (): Expense[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading expenses from storage:', e);
    return INITIAL_EXPENSES;
  }
};

export const saveStoredExpenses = (expenses: Expense[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error('Error saving expenses to storage:', e);
  }
};

export const exportAllDataBackup = () => {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    settings: getStoredSettings(),
    products: getStoredProducts(),
    sales: getStoredSales(),
    debtors: getStoredDebtors(),
    customers: getStoredCustomers(),
    expenses: getStoredExpenses(),
    categories: getStoredCategories(),
    adjustments: getStoredAdjustments(),
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kassa_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const clearAllData = () => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.DEBTORS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
};

export const resetAllToDemo = () => {
  clearAllData();
};

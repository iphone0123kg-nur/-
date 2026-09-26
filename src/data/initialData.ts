import { Product, Sale, ShopSettings, Debtor, Customer, Expense } from '../types';

export const INITIAL_SETTINGS: ShopSettings = {
  shopName: 'Менин Дүкөнүм',
  tagline: 'Соода жана касса системасы',
  address: '',
  phone: '',
  cashierName: 'Кассир',
  receiptFooter: 'Соодаңыз үчүн рахмат! Дагы келиңиз!',
  currency: 'сом',
  taxNumber: '',
};

export const INITIAL_CATEGORIES: string[] = [
  'Бардыгы',
];

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_DEBTORS: Debtor[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_EXPENSES: Expense[] = [];

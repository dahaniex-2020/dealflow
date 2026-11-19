import Dexie from 'dexie';

export const db = new Dexie('DealFlowDB');

// Version 3 kar diya hai taake naya structure load ho
db.version(3).stores({
  clients: '++id, name, email, company, phone',
  deals: '++id, title, clientId, value, stage, date',
  proposals: '++id, title, clientId, amount, status, date',
  invoices: '++id, clientId, amount, status, dealTitle, date',
  expenses: '++id, title, amount, category, date',
  settings: 'id, name, email, businessName, logo',
  payment_details: 'id' 
});
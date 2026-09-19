import type { BudgetData } from './types'

const iso = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10)
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export const demoData: BudgetData = {
  version: 1,
  participants: [
    { id: 'me', name: 'Я', share: 55, color: '#5b7cfa' },
    { id: 'partner', name: 'Девушка', share: 45, color: '#f38db8' }
  ],
  incomeSources: [{ id: 'salary', name: 'Зарплата', amount: 174000, days: [5, 20], enabled: true }],
  categories: [
    { id: 'transport', name: 'Транспорт', emoji: '🚕', color: '#5b7cfa', scope: 'shared', mode: 'percent', value: 9, rollover: 'reset' },
    { id: 'home', name: 'Дом', emoji: '🏠', color: '#f3ad55', scope: 'shared', mode: 'percent', value: 7, rollover: 'carry' },
    { id: 'supplies', name: 'Расходники', emoji: '🧻', color: '#50b99b', scope: 'shared', mode: 'percent', value: 6, rollover: 'reset' },
    { id: 'food', name: 'Рестораны и продукты', emoji: '🥑', color: '#b7e35f', scope: 'shared', mode: 'percent', value: 72, rollover: 'reset' },
    { id: 'shared-savings', name: 'Совместные накопления', emoji: '✨', color: '#9f7aea', scope: 'shared', mode: 'percent', value: 6, rollover: 'carry' },
    { id: 'personal-me', name: 'Личные · Я', emoji: '👤', color: '#5b7cfa', scope: 'personal', mode: 'percent', value: 55, rollover: 'carry' },
    { id: 'personal-partner', name: 'Личные · Девушка', emoji: '🌷', color: '#f38db8', scope: 'personal', mode: 'percent', value: 45, rollover: 'carry' }
  ],
  transactions: [
    { id: uid(), type: 'income', amount: 87000, date: iso(-6), participantId: 'me', scope: 'shared', comment: 'Аванс' },
    { id: uid(), type: 'expense', amount: 4320, categoryId: 'food', date: iso(-5), participantId: 'partner', scope: 'shared', comment: 'Продукты на неделю' },
    { id: uid(), type: 'expense', amount: 1850, categoryId: 'transport', date: iso(-3), participantId: 'me', scope: 'shared', comment: 'Такси' },
    { id: uid(), type: 'expense', amount: 2790, categoryId: 'home', date: iso(-2), participantId: 'partner', scope: 'shared', comment: 'Лампа и плед' },
    { id: uid(), type: 'expense', amount: 1260, categoryId: 'food', date: iso(-1), participantId: 'me', scope: 'shared', comment: 'Кофе и обед' }
  ],
  purchases: [
    { id: uid(), categoryId: 'food', name: 'Продукты на выходные', price: 3500, bought: false },
    { id: uid(), categoryId: 'home', name: 'Фильтры для воды', price: 1900, bought: false },
    { id: uid(), categoryId: 'supplies', name: 'Бытовая химия', price: 2400, bought: false }
  ],
  goals: [{ id: uid(), name: 'Отпуск у моря', target: 180000, saved: 62000, regular: 12000, color: '#9f7aea' }],
  transfers: [],
  settings: {
    theme: 'system', personalEnabled: true, periodType: 'month', customStart: iso(-15), customEnd: iso(15),
    allocation: { savings: 20, shared: 40, personal: 40 }
  }
}

export const loadData = (): BudgetData => {
  try {
    const saved = localStorage.getItem('vmeste-budget-data')
    return saved ? JSON.parse(saved) as BudgetData : demoData
  } catch { return demoData }
}

export const saveData = (data: BudgetData) => localStorage.setItem('vmeste-budget-data', JSON.stringify(data))

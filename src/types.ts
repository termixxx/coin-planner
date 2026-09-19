export type Theme = 'light' | 'dark' | 'system'
export type BudgetScope = 'shared' | 'personal'
export type CategoryMode = 'percent' | 'fixed'
export type RolloverRule = 'carry' | 'reset' | 'savings'
export type PeriodType = 'month' | 'payday' | 'custom'

export interface Participant { id: string; name: string; share: number; color: string }
export interface IncomeSource { id: string; name: string; amount: number; days: number[]; enabled: boolean }
export interface Category {
  id: string; name: string; emoji: string; color: string; scope: BudgetScope
  mode: CategoryMode; value: number; rollover: RolloverRule; archived?: boolean
}
export interface Transaction {
  id: string; type: 'income' | 'expense'; amount: number; categoryId?: string
  date: string; participantId: string; scope: BudgetScope; comment: string
}
export interface Purchase { id: string; categoryId: string; name: string; price: number; bought: boolean; transactionId?: string }
export interface Goal { id: string; name: string; target: number; saved: number; regular: number; color: string }
export interface Transfer { id: string; fromCategoryId: string; toCategoryId: string; amount: number; date: string }
export interface Settings {
  theme: Theme; personalEnabled: boolean; periodType: PeriodType; customStart: string; customEnd: string
  allocation: { savings: number; shared: number; personal: number }
}
export interface BudgetData {
  version: number; participants: Participant[]; incomeSources: IncomeSource[]; categories: Category[]
  transactions: Transaction[]; purchases: Purchase[]; goals: Goal[]; transfers: Transfer[]; settings: Settings
}

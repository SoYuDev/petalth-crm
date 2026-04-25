export interface Invoice {
  id: number;
  issueDate: string;
  amount: number;
  status: string; // 'PAID' o 'UNPAID'
}
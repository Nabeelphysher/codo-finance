export interface Transaction {
  transaction_id: string;
  t_date: string;
  u_date: string;
  finance_type: string;
  narration: string;
  department: string;
  debit: number;
  credit: number;
  running_balance: number;
  bill_reference_id?: string;
  created_by: string;
}

export interface Bill {
  bill_id: string;
  type: string;
  transaction_id_link: string;
  vendor_client_name: string;
  due_date?: string;
  paid_date?: string;
  file_url?: string;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  financeType?: string;
  department?: string;
  searchQuery?: string;
}

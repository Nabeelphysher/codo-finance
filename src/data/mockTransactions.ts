import { Transaction, Bill } from "@/types/transactions";

export const mockTransactions: Transaction[] = [
  {
    transaction_id: "TXN001",
    t_date: "2024-01-05",
    u_date: "2024-01-05",
    finance_type: "OFFICE EXPENSE",
    narration: "Space Rent - January 2024",
    department: "CODO AI Innovations",
    debit: 10000,
    credit: 0,
    running_balance: 240000,
    bill_reference_id: "BILL001",
    created_by: "admin@codo.ai"
  },
  {
    transaction_id: "TXN002",
    t_date: "2024-01-15",
    u_date: "2024-01-15",
    finance_type: "CLIENT INCOME",
    narration: "Albedo sixth Instalment",
    department: "CODO Agency - Development",
    debit: 0,
    credit: 150000,
    running_balance: 390000,
    bill_reference_id: "BILL002",
    created_by: "admin@codo.ai"
  },
  {
    transaction_id: "TXN003",
    t_date: "2024-01-20",
    u_date: "2024-01-20",
    finance_type: "CODO SALARY",
    narration: "Monthly Salary - Development Team",
    department: "CODO AI Innovations",
    debit: 85000,
    credit: 0,
    running_balance: 305000,
    created_by: "admin@codo.ai"
  },
  {
    transaction_id: "TXN004",
    t_date: "2024-02-05",
    u_date: "2024-02-05",
    finance_type: "OFFICE EXPENSE",
    narration: "Space Rent - February 2024",
    department: "CODO AI Innovations",
    debit: 10000,
    credit: 0,
    running_balance: 295000,
    bill_reference_id: "BILL003",
    created_by: "admin@codo.ai"
  },
  {
    transaction_id: "TXN005",
    t_date: "2024-02-12",
    u_date: "2024-02-12",
    finance_type: "CLIENT INCOME",
    narration: "Project XYZ - Phase 1 Payment",
    department: "CODO Agency - Development",
    debit: 0,
    credit: 200000,
    running_balance: 495000,
    bill_reference_id: "BILL004",
    created_by: "admin@codo.ai"
  }
];

export const mockBills: Bill[] = [
  {
    bill_id: "BILL001",
    type: "Expense Bill",
    transaction_id_link: "TXN001",
    vendor_client_name: "PropertyCo Real Estate",
    paid_date: "2024-01-05",
    file_url: "/bills/rent-jan-2024.pdf"
  },
  {
    bill_id: "BILL002",
    type: "Client Invoice",
    transaction_id_link: "TXN002",
    vendor_client_name: "Albedo Education",
    paid_date: "2024-01-15",
    file_url: "/bills/albedo-invoice-6.pdf"
  },
  {
    bill_id: "BILL003",
    type: "Expense Bill",
    transaction_id_link: "TXN004",
    vendor_client_name: "PropertyCo Real Estate",
    paid_date: "2024-02-05",
    file_url: "/bills/rent-feb-2024.pdf"
  },
  {
    bill_id: "BILL004",
    type: "Client Invoice",
    transaction_id_link: "TXN005",
    vendor_client_name: "XYZ Corporation",
    paid_date: "2024-02-12",
    file_url: "/bills/xyz-invoice-phase1.pdf"
  }
];

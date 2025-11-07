import { TransactionsTable } from "@/components/TransactionsTable";
import { AppLayout } from "@/components/AppLayout";

const Transactions = () => {
  return (
    <AppLayout 
      title="Exact Accounts Transactions" 
      subtitle="Complete ledger view with detailed transaction history"
    >
      <div className="p-4 md:p-6 lg:p-8">
        <TransactionsTable />
      </div>
    </AppLayout>
  );
};

export default Transactions;

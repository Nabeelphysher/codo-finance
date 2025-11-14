import { TransactionsTable } from "@/components/TransactionsTable";
import { AppLayout } from "@/components/AppLayout";

const Transactions = () => {
  return (
    <AppLayout fullWidth>
      <div className="px-4 pb-6 pt-2 md:px-6 md:pb-8 md:pt-4 lg:px-8">
        <TransactionsTable />
      </div>
    </AppLayout>
  );
};

export default Transactions;

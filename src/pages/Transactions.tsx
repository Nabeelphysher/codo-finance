import { TransactionsTable } from "@/components/TransactionsTable";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const Transactions = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64">
        <Header />
        <main className="p-6">
          <TransactionsTable />
        </main>
      </div>
    </div>
  );
};

export default Transactions;

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { PromoCard } from "@/components/PromoCard";
import { BalanceCard } from "@/components/BalanceCard";
import { TransactionsList } from "@/components/TransactionsList";
import { ActivityFeed } from "@/components/ActivityFeed";
import { SpendingTrends } from "@/components/SpendingTrends";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Header />
          
          <div className="mb-8">
            <PromoCard />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <BalanceCard />
            <TransactionsList />
          </div>

          <div className="mb-8">
            <SpendingTrends />
          </div>
        </div>
      </main>

      <aside className="w-80 bg-card border-l border-border p-6">
        <ActivityFeed />
      </aside>
    </div>
  );
};

export default Index;

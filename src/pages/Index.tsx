import { AppLayout } from "@/components/AppLayout";
import { PromoCard } from "@/components/PromoCard";
import { BalanceCard } from "@/components/BalanceCard";
import { TransactionsList } from "@/components/TransactionsList";
import { ActivityFeed } from "@/components/ActivityFeed";
import { SpendingTrends } from "@/components/SpendingTrends";

const Index = () => {
  return (
    <AppLayout 
      title="Good morning, Arnold" 
      subtitle="Let's take care of your finances."
    >
      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            <PromoCard />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <BalanceCard />
              <TransactionsList />
            </div>

            <SpendingTrends />

            <div className="xl:hidden">
              <ActivityFeed />
            </div>
          </div>
        </div>

        {/* Activity Sidebar - Hidden on mobile/tablet */}
        <aside className="hidden xl:block xl:w-80 bg-card border-l border-border p-6 overflow-auto">
          <ActivityFeed />
        </aside>
      </div>
    </AppLayout>
  );
};

export default Index;

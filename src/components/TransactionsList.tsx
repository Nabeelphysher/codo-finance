import { UtensilsCrossed, ShoppingCart } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  icon: React.ReactNode;
  amount: string;
  date: string;
}

const transactions: Transaction[] = [
  {
    id: "1",
    type: "Restaurant",
    icon: <UtensilsCrossed className="w-5 h-5" />,
    amount: "₹129.11",
    date: "1h ago",
  },
  {
    id: "2",
    type: "Grocery shopping",
    icon: <ShoppingCart className="w-5 h-5" />,
    amount: "₹92.43",
    date: "2h ago",
  },
];

export const TransactionsList = () => {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent expenses</h3>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>Date</span>
          <span className="hidden sm:inline">Amount</span>
        </div>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
                {transaction.icon}
              </div>
              <div>
                <p className="font-medium text-foreground">{transaction.type}</p>
                <p className="text-sm text-muted-foreground">{transaction.date}</p>
              </div>
            </div>
            <span className="font-semibold text-foreground">{transaction.amount}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button className="text-primary text-sm font-medium hover:underline">
          See all history
        </button>
        <button className="text-primary text-sm font-medium hover:underline">
          Actions...
        </button>
      </div>
    </div>
  );
};

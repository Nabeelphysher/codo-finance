import { Plane, UtensilsCrossed, Laptop } from "lucide-react";

interface Trend {
  id: string;
  category: string;
  icon: React.ReactNode;
  amount: string;
  description: string;
}

const trends: Trend[] = [
  {
    id: "1",
    category: "Travel",
    icon: <Plane className="w-5 h-5" />,
    amount: "₹1,322",
    description: "You spend over ₹1,322 on foods this quarter",
  },
  {
    id: "2",
    category: "Eating out",
    icon: <UtensilsCrossed className="w-5 h-5" />,
    amount: "₹4,231",
    description: "You spent over ₹4,231 on eating out this quarter",
  },
  {
    id: "3",
    category: "Tech",
    icon: <Laptop className="w-5 h-5" />,
    amount: "₹999",
    description: "You spent over ₹999 on tech this quarter",
  },
];

export const SpendingTrends = () => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">Your spending trends</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trends.map((trend) => (
          <div key={trend.id} className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
                {trend.icon}
              </div>
            </div>
            <h4 className="font-semibold text-foreground mb-2">{trend.category}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {trend.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button className="text-primary text-sm font-medium hover:underline">
          See all details
        </button>
        <button className="text-primary text-sm font-medium hover:underline">
          Update available!
        </button>
      </div>
    </div>
  );
};

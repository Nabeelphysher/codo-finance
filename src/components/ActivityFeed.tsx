import { ArrowDownLeft, UtensilsCrossed, Send } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  icon: React.ReactNode;
  amount: string;
  time: string;
  iconBg: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "Money received",
    icon: <ArrowDownLeft className="w-4 h-4" />,
    amount: "₹120.00",
    time: "18h ago",
    iconBg: "bg-success",
  },
  {
    id: "2",
    type: "Restaurant",
    icon: <UtensilsCrossed className="w-4 h-4" />,
    amount: "₹129.11",
    time: "1h ago",
    iconBg: "bg-warning",
  },
  {
    id: "3",
    type: "Money sent",
    icon: <Send className="w-4 h-4" />,
    amount: "₹200.00",
    time: "2h ago",
    iconBg: "bg-primary",
  },
];

export const ActivityFeed = () => {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Activity</h3>
        <button className="text-primary text-sm font-medium hover:underline">
          See all
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${activity.iconBg} flex items-center justify-center text-white`}>
                {activity.icon}
              </div>
              <div>
                <p className="font-medium text-foreground">{activity.type}</p>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </div>
            <span className="font-semibold text-foreground">{activity.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

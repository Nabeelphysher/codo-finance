import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const BalanceCard = () => {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total balance</p>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">₹9,856.19</h2>
        </div>
        <button className="text-primary text-sm font-medium hover:underline">
          SEE MORE
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-accent/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Badge className="bg-[#E91E63] text-white hover:bg-[#E91E63]">VISA</Badge>
            <span className="text-sm text-muted-foreground">Visa Basic - ₹5,211.87</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <span className="text-xs">•••</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-accent/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Badge className="bg-primary text-primary-foreground">VISA</Badge>
            <span className="text-sm text-muted-foreground">Visa Premium - ₹4,644.32</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <span className="text-xs">•••</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const PromoCard = () => {
  return (
    <div className="bg-gradient-primary rounded-2xl p-6 shadow-card relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-primary-foreground mb-2">
              Upgrade to Premium! 50% off now!
            </h3>
            <p className="text-primary-foreground/90 text-sm mb-4 max-w-md">
              Claim your unique fantastic discount and upgrade to monexa Premium! Get even more control of your money!
            </p>
            <Button 
              variant="secondary" 
              className="bg-white text-primary hover:bg-white/90 rounded-full px-6"
            >
              Let's go!
            </Button>
          </div>
          <div className="text-6xl">🏆</div>
        </div>
      </div>
      
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
    </div>
  );
};

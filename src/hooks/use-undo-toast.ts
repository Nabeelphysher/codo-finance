import { createElement, useCallback } from "react";

import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

interface UndoToastOptions {
  entity: string;
  identifier: string;
  onUndo: () => Promise<void> | void;
}

export const useUndoToast = () => {
  const { toast } = useToast();

  return useCallback(
    ({ entity, identifier, onUndo }: UndoToastOptions) => {
      const handleUndo = async () => {
        try {
          await onUndo();
          toast({
            title: "Deletion undone",
            description: `${identifier} has been restored.`,
            duration: 3500,
          });
        } catch (error) {
          toast({
            title: "Undo failed",
            description: error instanceof Error ? error.message : `Unable to restore ${identifier}.`,
            variant: "destructive",
          });
        }
      };

      toast({
        title: `${entity} deleted`,
        description: `${identifier} removed. You can undo this action.`,
        duration: 6000,
        action: createElement(
          ToastAction,
          {
            altText: `Undo delete ${identifier}`,
            onClick: handleUndo,
          },
          "Undo",
        ),
      });
    },
    [toast],
  );
};


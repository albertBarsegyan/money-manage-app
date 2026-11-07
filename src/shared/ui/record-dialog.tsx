"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function RecordDialog({
  title,
  description,
  open = true,
  onClose,
  children,
}: {
  title: string;
  description: string;
  open?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
            {description}
          </p>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit financial information stored locally in Finora.
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

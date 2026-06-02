import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, Dialog } from "./ui/dialog";
import { Button } from "./ui/button";

export function VersionHistoryDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 py-4 text-center">Version history is not available in offline mode.</p>
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

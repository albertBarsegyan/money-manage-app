import { Button } from "@/shared/ui/button";

export function FormActions({
  onCancel,
  submit,
  isSubmitting = false,
}: {
  onCancel: () => void;
  submit: string;
  isSubmitting?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submit}
      </Button>
    </div>
  );
}

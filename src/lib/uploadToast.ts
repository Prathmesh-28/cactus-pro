import { toast } from 'sonner';

export function toastImportSuccess(count: number, entity = 'row') {
  toast.success(`✓ ${count} ${entity}${count !== 1 ? 's' : ''} imported successfully`, {
    duration: 3000,
  });
}

export function toastImportError(msg: string) {
  toast.error(`Import failed: ${msg}`, { duration: 5000 });
}

export function toastImportWarning(matched: number, skipped: number, skippedNames?: string[]) {
  const detail = skippedNames?.length
    ? ` Skipped: ${skippedNames.slice(0, 3).join(', ')}${skippedNames.length > 3 ? ` +${skippedNames.length - 3} more` : ''}`
    : '';
  toast.warning(`${matched} imported, ${skipped} skipped.${detail}`, { duration: 6000 });
}

export function toastSaved(entity?: string) {
  toast.success(entity ? `${entity} saved` : 'Saved', { duration: 2000 });
}

export function toastDeleted(entity?: string) {
  toast.success(entity ? `${entity} deleted` : 'Deleted', { duration: 2000 });
}

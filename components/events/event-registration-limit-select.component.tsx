"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

const LIMITS = ["10", "20", "30"];

/** Rows per page on the registration review table. Always resets to page 1,
 *  otherwise a larger page size can land past the end of the new result set. */
export function EventRegistrationLimitSelect({ limit }: { limit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = String(limit);

  function change(next: string | null) {
    if (!next || next === value) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", next);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
        Rows
      </span>
      <Combobox items={LIMITS} value={value} onValueChange={change}>
        <ComboboxTrigger className="flex h-8 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2.5 text-[12px] font-medium text-on-surface transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <ComboboxValue />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxEmpty>No option</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option} value={option}>
                {option}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

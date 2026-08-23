"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export type Option = { value: string; label: string }

export function SingleCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  ariaInvalid,
  disabled,
  className,
}: {
  options: Option[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  emptyLabel: string
  ariaInvalid?: boolean
  disabled?: boolean
  className?: string
}) {
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
    >
      <ComboboxInput
        className={className}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

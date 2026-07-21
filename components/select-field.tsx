import { Label } from "./ui/label";
import { Select, SelectIcon, SelectItem, SelectList, SelectPopup, SelectPortal, SelectPositioner, SelectTrigger, SelectValue } from "./ui/select";

const defaultFieldClassName =
  "h-[46px] rounded-[14px] border-[#d1d5db] bg-white px-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#4438ff] focus-visible:ring-[color:rgba(68,56,255,0.12)] dark:border-white/10 dark:bg-[#151d2c] dark:text-white dark:placeholder:text-[#64748b]";

export function SelectField({
  label,
  value,
  onChange,
  options,
  fieldClassName = defaultFieldClassName,
}: {
  label: string;
  value: string;
  fieldClassName?: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="text-[14px] font-medium text-[#374151] dark:text-[#d1d5db]">{label}</Label>
      <Select
        value={value}
        onValueChange={onChange}
        items={options}
      >
        <SelectTrigger className={fieldClassName}>
          <SelectValue placeholder={`Select ${label}`} />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner>
            <SelectPopup>
              <SelectList>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </div>
  );
}

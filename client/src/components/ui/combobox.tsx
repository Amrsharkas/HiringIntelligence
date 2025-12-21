import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowCustomValue?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  allowCustomValue = true,
  className
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setInputValue("");
  };

  const handleCreateCustom = () => {
    if (inputValue.trim()) {
      onValueChange(inputValue.trim());
      setOpen(false);
      setInputValue("");
    }
  };

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  );

  const allOptions = value && !options.includes(value) ? [value, ...options] : options;
  const isNewOption = inputValue.trim() && !options.includes(inputValue.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0 max-h-80 overflow-y-auto">
        <Command>
          <CommandInput
            placeholder="Search or type new value..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandEmpty>
            {allowCustomValue && inputValue.trim() ? (
              <div className="py-2 px-4 text-sm">
                <p className="text-slate-500 mb-2">No options found.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCreateCustom}
                  className="w-full justify-start text-primary hover:text-blue-700"
                >
                  Create "{inputValue.trim()}"
                </Button>
              </div>
            ) : (
              <p className="py-2 px-4 text-sm text-slate-500">No options found.</p>
            )}
          </CommandEmpty>
          {filteredOptions.length > 0 && (
            <CommandGroup>
              {allOptions
                .filter(option => option.toLowerCase().includes(inputValue.toLowerCase()))
                .map((option) => (
                  <CommandItem
                    key={option}
                    onSelect={() => handleSelect(option)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
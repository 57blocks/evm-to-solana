import { ChangeEvent } from "react";

interface TokenAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  connected?: boolean;
}

export const TokenAmountInput: React.FC<TokenAmountInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  min = 0,
  connected = true,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#667eea]/40 disabled:bg-gray-50 disabled:text-gray-400"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      disabled={disabled || !connected}
      min={min}
    />
  );
};

import { ButtonHTMLAttributes } from "react";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  spinnerType?: "char" | "dots";
  variant?: "default" | "outline";
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  isLoading,
  loadingText,
  spinnerType = "char",
  variant = "default",
  className,
  children,
  ...props
}) => {
  const baseClass =
    "px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";
  const variantClass =
    variant === "outline"
      ? "border border-[#667eea] text-[#667eea] hover:bg-[#667eea]/10"
      : "bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0";

  return (
    <button
      type="button"
      className={`${baseClass} ${variantClass} ${className || ""}`}
      disabled={props.disabled || isLoading}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {isLoading && (
          <span
            className={
              spinnerType === "dots" ? "animate-pulse tracking-widest" : ""
            }
          >
            {spinnerType === "dots" ? "..." : "⏳"}
          </span>
        )}
        <span>{isLoading ? loadingText || "Processing..." : children}</span>
      </span>
    </button>
  );
};

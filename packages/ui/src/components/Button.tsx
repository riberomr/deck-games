import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", ...props }, ref) => {
        const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

        const variants: Record<string, string> = {
            primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
            secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
            outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500"
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${className || ""}`}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";

import * as React from "react";

export const Card = ({
    className,
    title,
    children,
}: {
    className?: string;
    title?: string;
    children: React.ReactNode;
}) => {
    return (
        <div
            className={`bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden ${className || ""
                }`}
        >
            {title && (
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h3>
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
};

import { motion } from 'framer-motion';

interface DiscProps {
    color: 'red' | 'yellow';
    isWinning?: boolean;
    isDimmed?: boolean;
}

export const Disc = ({ color, isWinning, isDimmed }: DiscProps) => {
    return (
        <motion.div
            initial={{ y: -300, opacity: 0 }}
            animate={{ y: 0, opacity: isDimmed ? 0.5 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative w-full h-full rounded-full shadow-inner ${color === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                } ${isWinning ? 'ring-4 ring-white z-10' : ''}`}
        >
            {isWinning && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 bg-white/30 rounded-full animate-pulse"
                />
            )}
        </motion.div>
    );
};

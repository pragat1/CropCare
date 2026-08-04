import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

/** Fades + lifts content into view once. */
export function FadeIn({
  children,
  className,
  delay = 0,
  ...rest
}: { children: ReactNode; className?: string; delay?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct <Stagger.Item> children into view. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/** Glass surface with a subtle hover lift. */
export function GlassCard({
  children,
  className,
  interactive = true,
  ...rest
}: { children: ReactNode; className?: string; interactive?: boolean } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={interactive ? { y: -3 } : undefined}
      transition={{ duration: 0.25, ease: EASE }}
      className={cn("glass-panel p-6", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

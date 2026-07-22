/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé : animated-list.tsx
 * @created 2026-07-22
 * @updated 2026-07-22
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../cn.js';

export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedList = React.memo(
  ({ className, children }: AnimatedListProps) => {
    const childrenArray = React.Children.toArray(children);

    const itemsToShow = useMemo(() => {
      return childrenArray;
    }, [childrenArray]);

    return (
      <motion.div
        className={cn('flex flex-col gap-3', className)}
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1, // Stagger effect
            },
          },
        }}
      >
        <AnimatePresence>
          {itemsToShow.map((item, i) => (
            <AnimatedListItem key={(item as React.ReactElement).key || i}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  },
);

AnimatedList.displayName = 'AnimatedList';

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      layout
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1 },
      }}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 40 }}
      className="mx-auto w-full"
    >
      {children}
    </motion.div>
  );
}

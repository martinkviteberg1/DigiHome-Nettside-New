'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function Bar({ width, className, barClassName, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <div className={className}>
      <motion.div
        className={barClassName}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay }}
        style={reduce ? { width } : undefined}
      />
    </div>
  );
}

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export const colors = {
  cream: '#FFEDB9', sun: '#FFCB56', peach: '#FFA259', coral: '#FF7E7E',
  canvas: '#FFFAF0', surface: '#FFFDF8', ink: '#3D302B', muted: '#74655F',
} as const;

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`cl-button ${className}`.trim()} {...props} />;
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`cl-card ${className}`.trim()} {...props} />;
}

export function Pill({ children, tone = 'sun' }: { children: ReactNode; tone?: 'sun' | 'coral' | 'cream' }) {
  return <span className={`cl-pill cl-pill--${tone}`}>{children}</span>;
}

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const LOGO_SRC = '/icons/delfo-logo.png';

type AppBrandProps = {
  href?: string;
  className?: string;
  width?: number;
  /** Ícone recortado (topo do logo) para barras compactas */
  variant?: 'full' | 'mark';
  priority?: boolean;
  onClick?: () => void;
};

export function AppBrand({
  href = '/dashboard',
  className,
  width = 168,
  variant = 'full',
  priority = false,
  onClick,
}: AppBrandProps) {
  const isMark = variant === 'mark';
  const size = isMark ? 36 : width;
  const height = isMark ? 36 : Math.round(width * 0.9);

  const image = (
    <Image
      src={LOGO_SRC}
      alt="DelfoInvestIA — Orientação Financeira Inteligente"
      width={size}
      height={height}
      priority={priority}
      unoptimized
      className={cn(
        'object-contain',
        isMark ? 'h-9 w-9 rounded-md object-cover object-top' : 'h-auto max-h-24 w-auto max-w-[min(100%,168px)]'
      )}
    />
  );

  if (!href) {
    return (
      <span className={cn('inline-flex shrink-0', className)} onClick={onClick}>
        {image}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn('inline-flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-lg', className)}
    >
      {image}
    </Link>
  );
}

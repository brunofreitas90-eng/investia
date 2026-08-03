import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  accentClassName?: string;
};

export function BrandLogo({
  className = 'text-xl font-bold text-white tracking-tight',
  accentClassName = 'text-emerald-400',
}: BrandLogoProps) {
  return (
    <span className={cn(className)}>
      Delfo<span className={cn(accentClassName)}>InvestIA</span>
    </span>
  );
}

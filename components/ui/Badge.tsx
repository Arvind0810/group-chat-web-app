interface BadgeProps {
  count: number;
}

export function Badge({ count }: BadgeProps) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-indigo-600 rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
}

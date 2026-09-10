export function Skeleton({ className = "", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-white/7 ${className}`}
      {...props}
    />
  );
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-grid place-items-center rounded-[var(--radius-md)] text-white shadow-soft-md"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
      }}
      aria-hidden
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" fill="white" fillOpacity="0.95" />
        <path
          d="M7 11v4.2c0 .5.3 1 .8 1.2 1.3.7 2.8 1.1 4.2 1.1s2.9-.4 4.2-1.1c.5-.2.8-.7.8-1.2V11"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          strokeOpacity="0.95"
        />
      </svg>
    </span>
  );
}

export function Avatar({
  name,
  color,
  size = 38,
  online,
}: {
  name: string;
  color: string;
  size?: number;
  online?: boolean;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <span
        className="grid h-full w-full place-items-center rounded-full font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          fontSize: size * 0.38,
        }}
      >
        {initials}
      </span>
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full border-2"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: 'var(--success)',
            borderColor: 'var(--surface)',
          }}
        />
      )}
    </span>
  );
}

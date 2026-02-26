type Segment = { className: string; value: number };

interface SegmentedBarProps {
  segments: Segment[];
  total: number;
  height?: string;
  className?: string;
}

export function SegmentedBar({
  segments,
  total,
  height = "h-3",
  className,
}: SegmentedBarProps) {
  if (total <= 0) return null;

  return (
    <div
      className={`flex ${height} rounded-full overflow-hidden ${className ?? ""}`}
    >
      {segments.map(
        (seg) =>
          seg.value > 0 && (
            <div
              key={seg.className}
              className={seg.className}
              style={{ width: `${(seg.value / total) * 100}%` }}
            />
          ),
      )}
    </div>
  );
}

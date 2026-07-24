import Image from "next/image";

interface RialoMarkProps {
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

export function RialoMark({
  size = "medium",
  showLabel = false,
}: RialoMarkProps) {
  return (
    <span
      className={`rialo-mark rialo-mark-${size} ${showLabel ? "rialo-mark-with-label" : ""}`}
    >
      <span className="rialo-mark-image">
        <Image
          src="/brand/rialo-mark.png"
          alt={showLabel ? "" : "Rialo"}
          width={400}
          height={400}
          priority={size === "large"}
          unoptimized
        />
      </span>
      {showLabel && <strong className="rialo-mark-label">Rialo</strong>}
    </span>
  );
}

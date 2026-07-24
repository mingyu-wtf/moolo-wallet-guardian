import Image from "next/image";

interface RialoMarkProps {
  size?: "mini" | "small" | "medium" | "large";
  decorative?: boolean;
}

export function RialoMark({
  size = "medium",
  decorative = false,
}: RialoMarkProps) {
  return (
    <span className={`rialo-mark rialo-mark-${size}`}>
      <Image
        src="/brand/rialo-mark.png"
        alt={decorative ? "" : "Rialo"}
        width={400}
        height={400}
        priority={size === "large"}
        unoptimized
      />
    </span>
  );
}

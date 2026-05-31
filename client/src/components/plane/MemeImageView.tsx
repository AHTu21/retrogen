import type { MemeCropDto } from "../../types";

type Props = {
  src: string;
  width: number;
  height: number;
  rotation?: number;
  crop?: MemeCropDto;
  selected?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function MemeImageView({ src, width, height, rotation = 0, crop, selected, className = "", onClick }: Props) {
  const ring = selected ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-transparent" : "";

  const inner = !crop ? (
    <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
  ) : (
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none max-w-none"
      style={{
        width: `${100 / crop.w}%`,
        height: `${100 / crop.h}%`,
        marginLeft: `${(-crop.x / crop.w) * 100}%`,
        marginTop: `${(-crop.y / crop.h) * 100}%`,
      }}
    />
  );

  return (
    <div
      className={`overflow-hidden ${ring} ${className}`}
      style={{ width, height, transform: rotation ? `rotate(${rotation}deg)` : undefined }}
      onClick={onClick}
    >
      {inner}
    </div>
  );
}

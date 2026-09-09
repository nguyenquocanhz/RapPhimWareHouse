"use client";

import Image from "next/image";
import { useState } from "react";

interface ThumbProps {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  rounded?: boolean;
}

/**
 * Anh phim phu kin khung chua. Nguon phim doi khi tra ve link anh hong,
 * nen component tu chuyen sang o giu cho thay vi de trong mot mang den.
 */
export function Thumb({ src, alt, sizes, className = "", priority = false }: ThumbProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`grid size-full place-items-center bg-surface text-muted ${className}`}
        aria-hidden="true"
      >
        <span className="px-2 text-center text-xs">Không có ảnh</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

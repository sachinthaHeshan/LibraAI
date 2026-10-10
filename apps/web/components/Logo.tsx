import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

const sizes = {
  sm: { width: 200, height: 64, className: "h-10 w-auto" },
  md: { width: 260, height: 83, className: "h-12 w-auto" },
  lg: { width: 400, height: 127, className: "h-20 w-auto sm:h-24" },
};

export function Logo({
  href = "/",
  className = "",
  size = "md",
  priority = false,
}: LogoProps) {
  const dim = sizes[size];

  const image = (
    <Image
      alt="LibraAI — Library Management System"
      className={`${dim.className} object-contain ${className}`}
      height={dim.height}
      priority={priority}
      src="/libra-logo.png"
      width={dim.width}
    />
  );

  if (href == null) return image;

  return (
    <Link aria-label="LibraAI home" className="inline-flex items-center" href={href}>
      {image}
    </Link>
  );
}

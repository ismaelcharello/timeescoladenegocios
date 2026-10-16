import Image from "next/image";

type TimeLogoProps = {
  variant: "blue" | "white";
  alt?: string;
  className?: string;
  priority?: boolean;
};

const sources = {
  blue: "/time-logo-oficial-blue.png",
  white: "/time-logo-oficial-white.png",
} as const;

export default function TimeLogo({
  variant,
  alt = "TIME Escola de Negócios",
  className,
  priority = false,
}: TimeLogoProps) {
  return (
    <Image
      src={sources[variant]}
      alt={alt}
      className={className}
      width={2048}
      height={709}
      priority={priority}
      unoptimized
    />
  );
}

interface Props {
  initials: string;
  size?: "md" | "lg";
  tone?: "chili" | "default" | "dim";
  selected?: boolean;
}

const tones = {
  chili: "bg-chili",
  default: "bg-surface-2",
  dim: "bg-surface text-faint",
};

export const Avatar = ({
  initials,
  size = "md",
  tone = "default",
  selected,
}: Props) => (
  <div
    className={`grid place-items-center rounded-full font-extrabold ${tones[tone]} ${
      size === "lg" ? "size-16 text-[22px]" : "size-12 text-[17px]"
    } ${selected ? "outline-gold outline-3 outline-offset-3" : ""}`}
  >
    {initials}
  </div>
);

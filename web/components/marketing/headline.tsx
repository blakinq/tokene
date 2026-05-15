type Props = {
  text: string;
  className?: string;
  baseDelay?: number;
  perWord?: number;
};

export function StaggerHeadline({
  text,
  className = "",
  baseDelay = 80,
  perWord = 55,
}: Props) {
  const words = text.split(/\s+/);
  return (
    <h1 className={`word-stagger ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          aria-hidden
          style={{ animationDelay: `${baseDelay + i * perWord}ms` }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}

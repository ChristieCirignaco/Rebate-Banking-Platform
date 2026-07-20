import { Fragment, type CSSProperties } from "react";

// CMS text fields of type "accent" mark highlighted words with [[double
// brackets]]; this renders those spans with the section's accent styling.
export function AccentText({
  text,
  accentClassName,
  accentStyle,
}: {
  text: string;
  accentClassName?: string;
  accentStyle?: CSSProperties;
}) {
  const parts = text.split(/\[\[(.+?)\]\]/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className={accentClassName} style={accentStyle}>
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

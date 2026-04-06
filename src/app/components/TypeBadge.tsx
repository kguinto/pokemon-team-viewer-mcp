import { TYPE_COLORS } from "../constants.js";

interface Props {
  type: string;
}

export function TypeBadge({ type }: Props) {
  const colors = TYPE_COLORS[type] ?? { bg: "#888", text: "#fff" };
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 7px",
      borderRadius: 4,
      fontSize: "0.65rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      background: colors.bg,
      color: colors.text,
    }}>
      {type}
    </span>
  );
}

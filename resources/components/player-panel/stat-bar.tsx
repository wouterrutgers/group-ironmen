import type { ReactElement } from "react";

interface StatBarProps {
  className?: string;
  color: string;
  bgColor: string;
  ratio?: number;
}
/**
 * Shows a stat like hp/prayer as a filling bar
 */
export const StatBar = ({ className, color, bgColor, ratio }: StatBarProps): ReactElement => {
  let background = bgColor;
  if (ratio === 1) {
    background = color;
  } else if (ratio !== undefined && ratio >= 0) {
    const percentage = ratio * 100;
    background = `linear-gradient(90deg, ${color}, ${percentage}%, ${bgColor} ${percentage}%)`;
  }

  return <div style={{ background }} className={`stat-bar ${className ?? ""}`} />;
};

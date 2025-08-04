import { Fragment, useRef, useState, type ReactElement } from "react";

import "./tooltip.css";
import { createPortal } from "react-dom";

export type ItemTooltipProps =
  | {
      type: "Item";
      name: string;
      quantity: number;
      highAlch: number;
      gePrice: number;
    }
  | {
      type: "Rune Pouch";
      name: string;
      totalHighAlch: number;
      totalGePrice: number;
      runes: { name: string; quantity: number }[];
    };

export const useItemTooltip = (): {
  tooltipElement: ReactElement;
  hideTooltip: () => void;
  showTooltip: (item: ItemTooltipProps) => void;
} => {
  const [item, setTooltipItem] = useState<ItemTooltipProps>();
  const tooltipRef = useRef<HTMLElement>(document.getElementById("tooltip")!);

  const hideTooltip = (): void => {
    setTooltipItem(undefined);
  };
  const showTooltip = (item: ItemTooltipProps): void => {
    setTooltipItem(item);
  };

  const lines: ({ key: string; value: string; type?: undefined } | { key: string; type: "separator" })[] = [];

  if (item?.type === "Item") {
    if (item.quantity > 1) {
      lines.push({ key: "name", value: `${item.name} x ${item.quantity.toLocaleString()}` });
    } else {
      lines.push({ key: "name", value: `${item.name}` });
    }
    if (item.highAlch > 0 || item.gePrice > 0) {
      lines.push({ key: "after-name", type: "separator" });
    }

    if (item.highAlch > 0) {
      const unitPrice = item.highAlch.toLocaleString();
      const totalPrice = (item.highAlch * item.quantity).toLocaleString();
      if (item.quantity > 1) {
        lines.push({ key: "HA", value: `HA: ${totalPrice}gp (${unitPrice}gp each)` });
      } else {
        lines.push({ key: "HA", value: `HA: ${unitPrice}gp` });
      }
    }

    if (item.gePrice > 0) {
      const unitPrice = item.gePrice.toLocaleString();
      const totalPrice = (item.gePrice * item.quantity).toLocaleString();
      if (item.quantity > 1) {
        lines.push({ key: "GE", value: `GE: ${totalPrice}gp (${unitPrice}gp each)` });
      } else {
        lines.push({ key: "GE", value: `GE: ${unitPrice}gp` });
      }
    }
  } else if (item?.type === "Rune Pouch") {
    const { name, totalHighAlch, totalGePrice, runes } = item;

    lines.push({ key: "name", value: name });
    lines.push({ key: "after-name", type: "separator" });
    lines.push({ key: "HA", value: `HA total: ${totalHighAlch.toLocaleString()}gp` });
    lines.push({ key: "GE", value: `GE total: ${totalGePrice.toLocaleString()}gp` });
    lines.push({ key: "after-prices", type: "separator" });
    for (const { name, quantity } of runes) {
      lines.push({ key: `rune ${name} ${quantity}`, value: `${quantity.toLocaleString()} ${name}` });
    }
  }

  const elements = [];
  let skipBreak = false;
  for (const [index, line] of lines.entries()) {
    if (line.type === "separator") {
      elements.push(<hr key={`span ${index}`} />);
      skipBreak = true;
      continue;
    }

    const { key, value } = line;
    if (index > 0 && !skipBreak) elements.push(<br key={`br ${key}`} />);
    elements.push(<Fragment key={key}>{value}</Fragment>);
    skipBreak = false;
  }

  const tooltipElement = createPortal(elements, tooltipRef.current);

  return { tooltipElement, hideTooltip, showTooltip };
};

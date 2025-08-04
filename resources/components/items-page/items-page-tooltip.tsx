import { useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

export interface ItemsPriceTooltipProps {
  perPiecePrice: number;
  totalPrice: number;
  quantity: number;
}

export const useItemsPriceTooltip = (): {
  tooltipElement: ReactElement;
  hideTooltip: () => void;
  showTooltip: (props: ItemsPriceTooltipProps) => void;
} => {
  const [tooltipData, setTooltipData] = useState<ItemsPriceTooltipProps>();
  const tooltipRef = useRef<HTMLElement>(document.getElementById("tooltip")!);

  const hideTooltip = (): void => {
    setTooltipData(undefined);
  };

  const showTooltip = (props: ItemsPriceTooltipProps): void => {
    setTooltipData(props);
  };

  let content: ReactElement = <></>;

  if (tooltipData) {
    const { perPiecePrice, quantity } = tooltipData;
    content = (
      <>
        {perPiecePrice.toLocaleString()}gp × {quantity.toLocaleString()}
      </>
    );
  }

  const tooltipElement = createPortal(content, tooltipRef.current);

  return { tooltipElement, hideTooltip, showTooltip };
};

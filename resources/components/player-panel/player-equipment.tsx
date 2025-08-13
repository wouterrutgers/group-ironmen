import { useContext, type ReactElement } from "react";
import { useItemTooltip } from "../tooltip/item-tooltip";
import { GameDataContext } from "../../context/game-data-context";
import { EquipmentSlot } from "../../game/equipment";
import type * as Member from "../../game/member";
import { useMemberEquipmentContext } from "../../context/group-context";
import { CachedImage } from "../cached-image/cached-image";

import "./player-equipment.css";
import { composeItemIconHref, formatShortQuantity, mappedGEPrice } from "../../game/items";

const VisibleEquipmentSlots: EquipmentSlot[] = [
  "Head",
  "Cape",
  "Amulet",
  "Weapon",
  "Body",
  "Shield",
  // "Arms",
  "Legs",
  // "Hair",
  "Gloves",
  "Boots",
  // "Jaw",
  "Ring",
  "Ammo",
];
const EquipmentSlotEmptyIcons = new Map<EquipmentSlot, string>([
  ["Head", "156-0.png"],
  ["Cape", "157-0.png"],
  ["Amulet", "158-0.png"],
  ["Weapon", "159-0.png"],
  ["Body", "161-0.png"],
  ["Shield", "162-0.png"],
  ["Legs", "163-0.png"],
  ["Gloves", "164-0.png"],
  ["Boots", "165-0.png"],
  ["Ring", "160-0.png"],
  ["Ammo", "166-0.png"],
]);

export const PlayerEquipment = ({ member }: { member: Member.Name }): ReactElement => {
  const { tooltipElement, hideTooltip, showTooltip } = useItemTooltip();
  const { items: itemData, gePrices: geData } = useContext(GameDataContext);
  const equipment = useMemberEquipmentContext(member);

  const slotElements = [];
  for (const slot of VisibleEquipmentSlots) {
    const item = equipment?.get(slot);
    if (!item) {
      slotElements.push(
        <div key={slot} className={`equipment-${slot.toLowerCase()} equipment-slot-empty`}>
          <CachedImage alt={`empty equipment ${slot} slot`} src={`/ui/${EquipmentSlotEmptyIcons.get(slot) ?? ""}`} />
        </div>,
      );
      continue;
    }

    const { itemID, quantity } = item;
    const itemDatum = itemData?.get(itemID);

    const wikiLink = `https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${itemID}`;
    const iconHref = composeItemIconHref(item, itemDatum);

    let quantityOverlay = undefined;
    if (quantity > 1) {
      quantityOverlay = <span className="player-equipment-item-quantity">{formatShortQuantity(quantity)}</span>;
    }

    const onPointerEnter = (): void => {
      if (!itemDatum) return;

      showTooltip({
        type: "Item",
        name: itemDatum.name,
        quantity: quantity,
        highAlch: itemDatum.highalch,
        gePrice: mappedGEPrice(item.itemID, geData, itemData),
      });
    };
    slotElements.push(
      <a
        href={wikiLink}
        target="_blank"
        rel="noopener noreferrer"
        key={slot}
        onPointerEnter={onPointerEnter}
        onPointerLeave={hideTooltip}
        className={`equipment-${slot.toLowerCase()} equipment-slot-filled`}
      >
        <CachedImage alt={itemDatum?.name ?? "equipment"} className="equipment-slot-item" src={iconHref} />
        {quantityOverlay}
      </a>,
    );
  }

  return (
    <div className="player-equipment">
      {slotElements}
      {tooltipElement}
    </div>
  );
};

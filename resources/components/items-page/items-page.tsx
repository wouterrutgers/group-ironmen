import { type ReactElement, Fragment, useContext, useState } from "react";
import { SearchElement } from "../search-element/search-element";
import type * as Member from "../../game/member";
import { GameDataContext } from "../../context/game-data-context";
import { composeItemIconHref, type ItemID } from "../../game/items";
import { GroupItemsContext, GroupMemberNamesContext } from "../../context/group-context";
import { Link } from "react-router-dom";
import { useItemsPriceTooltip } from "./items-page-tooltip";

import "./items-page.css";

type ItemFilter = "All" | Member.Name;
const ItemSortCategory = [
  "Total Quantity",
  "HA Total Value",
  "HA Unit Value",
  "GE Total Price",
  "GE Unit Price",
  "Alphabetical",
] as const;
type ItemSortCategory = (typeof ItemSortCategory)[number];

const ItemPanel = ({
  itemName,
  itemID,
  highAlchPer,
  gePricePer,
  imageURL,
  totalQuantity,
  filter,
  quantities,
}: {
  itemName: string;
  itemID: ItemID;
  highAlchPer: number;
  gePricePer: number;
  imageURL: string;
  totalQuantity: number;
  filter: ItemFilter;
  quantities: Map<Member.Name, number>;
}): ReactElement => {
  const { tooltipElement, hideTooltip, showTooltip } = useItemsPriceTooltip();

  const quantityBreakdown = [...quantities].map(([name, quantity]: [Member.Name, number]) => {
    if (filter !== "All" && filter !== name) return;

    const quantityPercent = (quantity / totalQuantity) * 100;
    return (
      <Fragment key={name}>
        <span>{name}</span>
        <span>{quantity}</span>
        <span
          className="items-page-panel-quantity-contribution"
          style={{ transform: `scaleX(${quantityPercent}%)`, background: `hsl(${quantityPercent}, 100%, 40%)` }}
        />
      </Fragment>
    );
  });

  const highAlch = highAlchPer * totalQuantity;
  const gePrice = gePricePer * totalQuantity;

  const wikiLink = `https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${itemID}`;

  return (
    <div className="items-page-panel rsborder rsbackground">
      <div className="items-page-panel-top rsborder-tiny">
        <div>
          <Link className="items-page-panel-name rstext" to={wikiLink} target="_blank" rel="noopener noreferrer">
            {itemName}
          </Link>
          <div className="items-page-panel-item-details">
            <span>Quantity</span>
            <span>{totalQuantity.toLocaleString()}</span>
            <span>High Alch</span>
            <span
              onPointerEnter={() =>
                showTooltip({
                  perPiecePrice: highAlchPer,
                  totalPrice: highAlch,
                  quantity: totalQuantity,
                })
              }
              onPointerLeave={hideTooltip}
            >
              {highAlch.toLocaleString()}gp
            </span>
            <span>GE Price</span>
            <span
              onPointerEnter={() =>
                showTooltip({
                  perPiecePrice: gePricePer,
                  totalPrice: gePrice,
                  quantity: totalQuantity,
                })
              }
              onPointerLeave={hideTooltip}
            >
              {gePrice.toLocaleString()}gp
            </span>
          </div>
        </div>
        <img loading="lazy" className="items-page-panel-icon" alt={itemName ?? "An unknown item"} src={imageURL} />
      </div>
      <div className="items-page-panel-quantity-breakdown">{quantityBreakdown}</div>
      {tooltipElement}
    </div>
  );
};

const ITEMS_PER_PAGE = 200;
const usePageSelection = ({
  itemCount,
}: {
  itemCount: number;
}): { pageNumber: number; resetPage: () => void; element: ReactElement } => {
  const [pageCurrent, setPageCurrent] = useState<number>(0);

  const pageCount = Math.ceil(itemCount / ITEMS_PER_PAGE);

  if (itemCount > 0 && pageCurrent >= pageCount) setPageCurrent(0);

  const buttons = [];
  for (let page = 0; page < pageCount; page += 1) {
    buttons.push(
      <button
        key={page}
        onClick={() => {
          setPageCurrent(page);
        }}
        className={`${pageCurrent === page ? "active" : ""} inventory-pager__button men-button`}
      >
        {page + 1}
      </button>,
    );
  }

  const element = (
    <div id="inventory-pager">
      <div id="inventory-pager-label">Page:</div>
      <div id="inventory-pager-buttons">{buttons}</div>
    </div>
  );
  return { pageNumber: pageCurrent, resetPage: () => setPageCurrent(0), element };
};

export const ItemsPage = (): ReactElement => {
  // const [itemCount, setItemCount] = useState<number>(0);
  const [filter, setFilter] = useState<ItemFilter>("All");
  const [searchString, setSearchString] = useState<string>("");
  const [sortCategory, setSortCategory] = useState<ItemSortCategory>("GE Unit Price");
  const { gePrices: geData, items: itemData } = useContext(GameDataContext);

  const members = useContext(GroupMemberNamesContext);
  const items = useContext(GroupItemsContext);

  interface ItemAggregates {
    totalHighAlch: number;
    totalGEPrice: number;
    filteredItems: {
      itemID: ItemID;
      itemName: string;
      quantityByMemberName: Map<Member.Name, number>;
      totalQuantity: number;
      gePrice: number;
      highAlch: number;
    }[];
  }
  const { totalHighAlch, totalGEPrice, filteredItems } = [...(items ?? [])].reduce<ItemAggregates>(
    (previousValue, [itemID, quantityByMemberName]) => {
      const itemDatum = itemData?.get(itemID);
      if (!itemDatum?.name.toLocaleLowerCase().includes(searchString)) return previousValue;

      let filteredTotalQuantity = 0;
      const filteredQuantities = new Map<Member.Name, number>();
      quantityByMemberName.forEach((quantity, name) => {
        if (filter !== "All" && filter !== name) return;

        filteredQuantities.set(name, quantity);
        filteredTotalQuantity += quantity;
      });

      if (filteredTotalQuantity <= 0) return previousValue;

      const highAlch = itemDatum?.highalch ?? 0;
      const gePrice = geData?.get(itemID) ?? 0;
      previousValue.totalHighAlch += filteredTotalQuantity * highAlch;
      previousValue.totalGEPrice += filteredTotalQuantity * gePrice;

      previousValue.filteredItems.push({
        itemID,
        itemName: itemDatum?.name ?? "@UNKNOWN",
        quantityByMemberName: filteredQuantities,
        totalQuantity: filteredTotalQuantity,
        gePrice,
        highAlch,
      });

      return previousValue;
    },
    { totalHighAlch: 0, totalGEPrice: 0, filteredItems: [] },
  );

  const { pageNumber, element: pageSelection } = usePageSelection({ itemCount: filteredItems.length });

  const fromIndex = pageNumber * ITEMS_PER_PAGE;
  const toIndex = (pageNumber + 1) * ITEMS_PER_PAGE;

  const renderedPanels = filteredItems
    .sort((lhs, rhs) => {
      switch (sortCategory) {
        case "Total Quantity":
          return rhs.totalQuantity - lhs.totalQuantity;
        case "HA Total Value":
          return rhs.highAlch * rhs.totalQuantity - lhs.highAlch * lhs.totalQuantity;
        case "HA Unit Value":
          return rhs.highAlch - lhs.highAlch;
        case "GE Total Price":
          return rhs.gePrice * rhs.totalQuantity - lhs.gePrice * lhs.totalQuantity;
        case "GE Unit Price":
          return rhs.gePrice - lhs.gePrice;
        case "Alphabetical":
          return lhs.itemName.localeCompare(rhs.itemName);
      }
    })
    .filter((_, index) => index >= fromIndex && index < toIndex)
    .map(({ gePrice, highAlch, itemID, itemName, quantityByMemberName, totalQuantity }) => (
      <ItemPanel
        key={itemID}
        itemID={itemID}
        imageURL={composeItemIconHref({ itemID, quantity: totalQuantity }, itemData?.get(itemID))}
        totalQuantity={totalQuantity}
        highAlchPer={highAlch}
        gePricePer={gePrice}
        filter={filter}
        itemName={itemName}
        quantities={quantityByMemberName}
      />
    ));

  return (
    <>
      <div id="items-page-head">
        <SearchElement
          onChange={(string) => setSearchString(string.toLocaleLowerCase())}
          id="items-page-search"
          placeholder="Search"
          auto-focus
        />
        {filteredItems.length > 0 ? pageSelection : undefined}
      </div>
      <div id="items-page-utility">
        <div className="rsborder-tiny rsbackground rsbackground-hover">
          <select
            value={sortCategory}
            onChange={(e) => {
              setSortCategory(e.target.value as ItemSortCategory);
            }}
          >
            {ItemSortCategory.map((category) => (
              <option key={category} value={category}>
                Sort: {category}
              </option>
            ))}
          </select>
        </div>
        <div className="rsborder-tiny rsbackground rsbackground-hover">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as ItemFilter);
            }}
          >
            {["All", ...members].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <span className="rsborder-tiny rsbackground rsbackground-hover">
          <span>{filteredItems.length.toLocaleString()}</span>&nbsp;
          <span>items</span>
        </span>
        <span className="rsborder-tiny rsbackground rsbackground-hover">
          HA:&nbsp;<span>{totalHighAlch.toLocaleString()}</span>
          <span>gp</span>
        </span>
        <span className="rsborder-tiny rsbackground rsbackground-hover">
          GE:&nbsp;<span>{totalGEPrice.toLocaleString()}</span>
          <span>gp</span>
        </span>
      </div>
      <section id="items-page-list">
        {filteredItems.length > 0 ? (
          renderedPanels
        ) : (
          <div id="items-page-no-items" className="rsborder rsbackground">
            <h3>Your group has no recorded items!</h3>
            <p>
              Either no members have logged in with the plugin, or there is an issue. Please double check that the names
              in the{" "}
              <Link to="../settings" className="orange-link">
                settings
              </Link>{" "}
              page <span className="emphasize">exactly</span> match your group members' in-game display names.
            </p>
          </div>
        )}
      </section>
    </>
  );
};

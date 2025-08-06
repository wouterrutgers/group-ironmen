import { useImageContext } from "../context/image-context";
import { composeItemIconHref, type ItemStack, type Item } from "../game/items";

export const useCachedImages = () => {
  const { getImageUrl } = useImageContext();

  return {
    getImageUrl,

    getItemIconUrl: (itemStack: ItemStack, itemDatum?: Item): string => {
      const basePath = composeItemIconHref(itemStack, itemDatum);
      return getImageUrl(basePath);
    },

    getUIImageUrl: (filename: string): string => {
      return getImageUrl(`/ui/${filename}`);
    },

    getIconUrl: (filename: string): string => {
      return getImageUrl(`/icons/${filename}`);
    },
  };
};

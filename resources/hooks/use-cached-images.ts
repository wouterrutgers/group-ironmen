import { useImageContext } from "../context/image-context";
import { composeItemIconHref, type ItemStack, type Item } from "../game/items";

export interface CachedImagesAPI {
  getImageUrl: (path: string) => string;
  getItemIconUrl: (itemStack: ItemStack, itemDatum?: Item) => string;
  getUIImageUrl: (filename: string) => string;
  getIconUrl: (filename: string) => string;
}

export const useCachedImages = (): CachedImagesAPI => {
  const { getImageUrl } = useImageContext();

  return {
    getImageUrl,
    getItemIconUrl: (itemStack: ItemStack, itemDatum?: Item): string => {
      const basePath = composeItemIconHref(itemStack, itemDatum);
      return getImageUrl(basePath);
    },
    getUIImageUrl: (filename: string): string => getImageUrl(`/ui/${filename}`),
    getIconUrl: (filename: string): string => getImageUrl(`/icons/${filename}`),
  };
};

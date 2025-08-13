import { createContext, useContext } from "react";

export interface ImageContextValue {
  getImageUrl: (path: string) => string;
}

export const ImageContext = createContext<ImageContextValue | null>(null);

export const useImageContext = (): ImageContextValue => {
  return useContext(ImageContext)!;
};

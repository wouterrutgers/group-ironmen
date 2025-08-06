import { useContext } from "react";
import { ImageContext, type ImageContextValue } from "./image-provider";

export const useImageContext = (): ImageContextValue => {
  return useContext(ImageContext)!;
};

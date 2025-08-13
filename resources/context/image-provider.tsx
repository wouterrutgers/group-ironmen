import { useMemo, useCallback, type ReactElement, type ReactNode } from "react";
import { ImageContext, type ImageContextValue } from "./image-context";
import imageManifest from "../data/images.json";

export const ImageProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const getImageUrl = useCallback((path: string): string => {
    const hash = (imageManifest as Record<string, string>)[path];
    return hash ? `${path}?v=${hash}` : path;
  }, []);

  const contextValue: ImageContextValue = useMemo(
    () => ({
      getImageUrl,
    }),
    [getImageUrl],
  );

  return <ImageContext.Provider value={contextValue}>{children}</ImageContext.Provider>;
};

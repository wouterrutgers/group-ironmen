import type { ReactElement } from "react";
import { useImageContext } from "../../context/image-context";

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export const CachedImage = ({ src, alt, ...props }: CachedImageProps): ReactElement => {
  const { getImageUrl } = useImageContext();

  return <img {...props} src={getImageUrl(src)} alt={alt} />;
};

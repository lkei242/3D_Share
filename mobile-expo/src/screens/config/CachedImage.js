import React from 'react';
import { Image as ExpoImage } from 'expo-image';

export default function CachedImage({ uri, style, ...props }) {
  if (!uri) return null;
  return (
    <ExpoImage
      source={{ uri }}
      style={style}
      cachePolicy="memory-disk"
      contentFit="cover"
      recyclingKey={uri}
      {...props}
    />
  );
}

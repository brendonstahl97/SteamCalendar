export type WishlistGame = {
  appId: number;
  name: string;
  releaseDateText: string;
  releaseDate?: string;
  releaseDateUnix?: number;
  capsuleUrl?: string;
  storeUrl: string;
};

export type EventTarget = {
  title: string;
  date: string;
  description: string;
};

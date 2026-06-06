/** Post con imagen opcional y flags de visibilidad por display. */
export type PostImageDisplayFields = {
  imageUrl?: string | null;
  imageShowParaTi?: boolean | null;
  imageShowSiguiendo?: boolean | null;
};

export function postShowsImageInParaTi(post: PostImageDisplayFields): boolean {
  return !!post.imageUrl && post.imageShowParaTi !== false;
}

export function postShowsImageInSiguiendo(post: PostImageDisplayFields): boolean {
  return !!post.imageUrl && post.imageShowSiguiendo !== false;
}

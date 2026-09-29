import { createLibraryRoutes } from "@/lib/library-route";
import { addFavorite, listFavorites, removeFavorite } from "@/services/favorites";

export const { GET, POST, DELETE } = createLibraryRoutes("favorites", {
  list: listFavorites,
  add: addFavorite,
  remove: removeFavorite,
});

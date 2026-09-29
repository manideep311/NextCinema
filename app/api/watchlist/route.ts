import { createLibraryRoutes } from "@/lib/library-route";
import { addToWatchlist, listWatchlist, removeFromWatchlist } from "@/services/watchlist";

export const { GET, POST, DELETE } = createLibraryRoutes("watchlist", {
  list: listWatchlist,
  add: addToWatchlist,
  remove: removeFromWatchlist,
});

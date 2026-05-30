import { notifyLobbyPrefsChanged } from "../../../lib/roomLobbyPrefs";
import type { ProfileDesign } from "../profileDesign";
import {
  LobbyFavoritesSection,
  LobbyHubHero,
  LobbyInsightStrip,
  LobbyRecentSection,
  useLobbyRoomLists,
} from "../profileLobbyUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  visitedCount: number;
  favoriteCount: number;
  lobbyRevision: number;
};

export function ProfileLobbyPanel({ d, visitedCount, favoriteCount, lobbyRevision }: Props) {
  const { favorites, recent, liveCount } = useLobbyRoomLists(lobbyRevision);

  return (
    <ProfileSectionFrame d={d} sectionId="lobby">
      <div className="flex min-w-0 flex-col gap-8">
        <LobbyHubHero d={d} />

        <LobbyInsightStrip d={d} visitedCount={visitedCount} favoriteCount={favoriteCount} liveCount={liveCount} />

        <LobbyFavoritesSection d={d} favorites={favorites} onFavoriteChange={() => notifyLobbyPrefsChanged()} />

        <LobbyRecentSection d={d} recent={recent} />
      </div>
    </ProfileSectionFrame>
  );
}

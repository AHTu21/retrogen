import { useState } from "react";
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
};

export function ProfileLobbyPanel({ d, visitedCount, favoriteCount }: Props) {
  const [listRevision, setListRevision] = useState(0);
  const { favorites, recent, liveCount } = useLobbyRoomLists(listRevision);

  return (
    <ProfileSectionFrame d={d} sectionId="lobby">
      <div className="flex min-w-0 flex-col gap-8">
        <LobbyHubHero d={d} />

        <LobbyInsightStrip d={d} visitedCount={visitedCount} favoriteCount={favoriteCount} liveCount={liveCount} />

        <LobbyFavoritesSection d={d} favorites={favorites} onFavoriteChange={() => setListRevision((n) => n + 1)} />

        <LobbyRecentSection d={d} recent={recent} />
      </div>
    </ProfileSectionFrame>
  );
}

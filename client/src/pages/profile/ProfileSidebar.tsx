import type { AuthUserDto } from "../../api";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import type { ProfileDesign } from "./profileDesign";
import { PROFILE_NAV_GROUPS, type ProfileNavItem, type ProfileSectionId } from "./profileHubTheme";
import { profileNavIcon } from "./profileNavIcons";
import { ProfileUserCard } from "./ProfileUserCard";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
  section: ProfileSectionId;
  navItems: ProfileNavItem[];
  visitedCount: number;
  favoriteCount: number;
  onGoSection: (id: ProfileSectionId) => void;
  onAvatarFile: (f: File | undefined) => void;
};

function NavItem({
  d,
  item,
  active,
  onGo,
  compact,
}: {
  d: ProfileDesign;
  item: ProfileNavItem;
  active: boolean;
  onGo: () => void;
  compact?: boolean;
}) {
  const isDanger = item.id === "danger";
  let cls = d.navLocked;
  if (!item.locked) {
    if (isDanger && !active) cls = d.navDanger;
    else if (active) cls = d.navActive;
    else cls = d.navIdle;
  }

  return (
    <button
      type="button"
      title={item.lockReason ?? item.hint}
      disabled={item.locked}
      onClick={onGo}
      className={`${cls} ${item.locked ? "cursor-not-allowed" : ""} ${
        compact ? "inline-flex shrink-0 whitespace-nowrap" : ""
      }`}
      aria-current={active ? "page" : undefined}
    >
      {profileNavIcon(item.id)}
      <span className="min-w-0 truncate">{item.label}</span>
      {item.navBadge ? (
        <span className={`ml-auto shrink-0 px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide ${d.rFull} ${d.badgeDone}`}>
          {item.navBadge}
        </span>
      ) : null}
      {item.locked ? (
        <svg className="ml-auto h-3.5 w-3.5 shrink-0 opacity-40" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 17a2 2 0 100-4 2 2 0 000 4zm0-14a5 5 0 00-5 5v3H5v4h14v-4h-2v-3a5 5 0 00-5-5z" />
        </svg>
      ) : null}
    </button>
  );
}

function SidebarNav({
  d,
  section,
  navItems,
  onGoSection,
  compact,
}: {
  d: ProfileDesign;
  section: ProfileSectionId;
  navItems: ProfileNavItem[];
  onGoSection: (id: ProfileSectionId) => void;
  compact?: boolean;
}) {
  const navById = new Map(navItems.map((n) => [n.id, n]));

  if (compact) {
    return (
      <nav className="border-b border-[var(--ph-separator)] px-3 py-2 lg:hidden" aria-label="Разделы">
        <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              d={d}
              item={item}
              active={section === item.id}
              compact
              onGo={() => onGoSection(item.id)}
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="hidden px-2 pb-4 lg:block" aria-label="Разделы настроек" title="Alt+↑ / Alt+↓ — переключение разделов">
      {PROFILE_NAV_GROUPS.map((group) => {
        const items = group.ids.map((id) => navById.get(id)).filter((n): n is ProfileNavItem => !!n);
        if (!items.length) return null;
        return (
          <div key={group.title}>
            <p className={d.navSection}>{group.title}</p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <NavItem d={d} item={item} active={section === item.id} onGo={() => onGoSection(item.id)} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function ProfileSidebar({
  d,
  prefs,
  authUser,
  section,
  navItems,
  visitedCount,
  favoriteCount,
  onGoSection,
  onAvatarFile,
}: Props) {
  return (
    <aside className={d.sidebar} aria-label="Навигация настроек">
      <div className="lg:hidden">
        <ProfileUserCard
          d={d}
          prefs={prefs}
          authUser={authUser}
          visitedCount={visitedCount}
          favoriteCount={favoriteCount}
          onAvatarFile={onAvatarFile}
          compact
        />
        <SidebarNav d={d} section={section} navItems={navItems} onGoSection={onGoSection} compact />
      </div>

      <div className={`${d.sidebarScroll} hidden lg:flex lg:flex-col`}>
        <ProfileUserCard
          d={d}
          prefs={prefs}
          authUser={authUser}
          visitedCount={visitedCount}
          favoriteCount={favoriteCount}
          onAvatarFile={onAvatarFile}
        />
        <SidebarNav d={d} section={section} navItems={navItems} onGoSection={onGoSection} />
      </div>
    </aside>
  );
}

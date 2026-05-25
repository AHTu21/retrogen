import type { AuthUserDto } from "../../api";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import type { ProfileDesign } from "./profileDesign";
import { PROFILE_NAV_GROUPS, type ProfileNavItem, type ProfileSectionId } from "./profileHubTheme";
import { ProfileAvatarBlock } from "./ProfileAvatarBlock";

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

function NavButton({
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
  const cls = item.locked ? d.navLocked : active ? d.navActive : d.navIdle;
  return (
    <button
      type="button"
      title={item.lockReason ?? item.hint}
      disabled={item.locked}
      onClick={onGo}
      className={`transition ${d.rSm} ${cls} ${item.locked ? "cursor-not-allowed" : ""} ${
        compact
          ? "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[0.8125rem]"
          : "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[0.8125rem]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={compact ? undefined : "truncate"}>{item.label}</span>
      {item.locked ? (
        <svg className="h-3.5 w-3.5 shrink-0 opacity-35" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 17a2 2 0 100-4 2 2 0 000 4zm0-14a5 5 0 00-5 5v3H5v4h14v-4h-2v-3a5 5 0 00-5-5z" />
        </svg>
      ) : null}
    </button>
  );
}

export function ProfileIdentityColumn({
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
  const navById = new Map(navItems.map((n) => [n.id, n]));

  return (
    <aside
      className={`flex w-full shrink-0 flex-col ${d.railWidth} ${d.rail} lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden lg:border-r`}
    >
      <div className={`border-b border-[var(--ph-separator)] lg:hidden ${d.rail}`}>
        <ProfileAvatarBlock
          d={d}
          prefs={prefs}
          authUser={authUser}
          visitedCount={visitedCount}
          favoriteCount={favoriteCount}
          onAvatarFile={onAvatarFile}
          variant="compact"
        />
      </div>

      <nav
        className={`border-b border-[var(--ph-separator)] lg:hidden ${d.railPad}`}
        aria-label="Разделы настроек"
      >
        <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]">
          {navItems.map((item) => (
            <NavButton
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

      <nav
        className={`hidden min-h-0 border-r lg:block lg:overflow-y-auto ${d.railDivider} ${d.railPad}`}
        aria-label="Разделы настроек"
      >
        {PROFILE_NAV_GROUPS.map((group) => {
          const items = group.ids.map((id) => navById.get(id)).filter((n): n is ProfileNavItem => !!n);
          if (!items.length) return null;
          return (
            <div key={group.title}>
              <p className={d.navGroup}>{group.title}</p>
              <ul className="space-y-0.5 pb-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <NavButton
                      d={d}
                      item={item}
                      active={section === item.id}
                      onGo={() => onGoSection(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className={`hidden min-h-0 lg:flex ${d.identityPane}`}>
        <ProfileAvatarBlock
          d={d}
          prefs={prefs}
          authUser={authUser}
          visitedCount={visitedCount}
          favoriteCount={favoriteCount}
          onAvatarFile={onAvatarFile}
          variant="rail"
        />
      </div>
    </aside>
  );
}

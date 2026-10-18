import { useState } from "react";
import { MENU_SPRITES } from "./sprites";

export type MenuItem =
  | { readonly kind: "command"; readonly label: string; readonly onSelect: () => void }
  | {
      readonly kind: "radio" | "checkbox";
      readonly label: string;
      readonly checked: boolean;
      readonly onSelect: () => void;
    }
  | { readonly kind: "separator" };

export type Menu = { readonly title: string; readonly items: readonly MenuItem[] };

const ROLES = { command: "menuitem", radio: "menuitemradio", checkbox: "menuitemcheckbox" };

/**
 * A Windows menu bar. Pressing a title opens its menu; while one is open, hovering another
 * title switches to it. Choosing an item or pressing anywhere else closes the menu, and that
 * press does nothing more, so dismissing a menu over the Board never Reveals a Cell.
 */
export function MenuBar({ menus }: { menus: readonly Menu[] }) {
  const [openTitle, setOpenTitle] = useState<string | null>(null);
  const close = () => setOpenTitle(null);

  return (
    <div role="menubar" className="menu-bar">
      {openTitle !== null && <div className="menu-backdrop" onMouseDown={close} />}
      {menus.map((menu) => {
        const open = menu.title === openTitle;
        return (
          <div key={menu.title} className="menu-bar-entry">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={open}
              className="menu-title"
              onMouseDown={(event) => {
                if (event.button === 0) setOpenTitle(open ? null : menu.title);
              }}
              onMouseEnter={() => {
                if (openTitle !== null) setOpenTitle(menu.title);
              }}
            >
              <span className="menu-text" data-testid="menu-text">
                {menu.title}
              </span>
            </button>
            {open && (
              <div role="menu" aria-label={menu.title} className="menu">
                {menu.items.map((item, i) =>
                  item.kind === "separator" ? (
                    <div key={i} role="separator" className="menu-separator" />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      role={ROLES[item.kind]}
                      aria-checked={item.kind === "command" ? undefined : item.checked}
                      className="menu-item"
                      onClick={() => {
                        close();
                        item.onSelect();
                      }}
                    >
                      <span className="menu-check" style={{ maskImage: MENU_SPRITES.check }} />
                      <span className="menu-text" data-testid="menu-text">
                        {item.label}
                      </span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

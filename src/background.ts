import { t } from "./shared/i18n.ts"

const ext = globalThis.chrome ?? (globalThis as unknown as { browser: typeof chrome }).browser

function installMenu() {
  ext.contextMenus.removeAll(() => {
    ext.contextMenus.create({
      id: "open-proper-table",
      title: t("contextOpen"),
      contexts: ["page", "selection", "link", "editable"],
    })
  })
}

ext.runtime.onInstalled.addListener(installMenu)
ext.runtime.onStartup.addListener(installMenu)

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "open-proper-table" || tab?.id == null) return
  const frameId = typeof info.frameId === "number" ? info.frameId : undefined
  void ext.tabs.sendMessage(tab.id, { type: "open-context" }, frameId == null ? {} : { frameId })
})

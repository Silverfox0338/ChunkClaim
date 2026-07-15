import {
    world,
    system,
    Player,
    ItemStack,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

// ─── Constants ───────────────────────────────────────────────────────────────

const CLAIM_STICK_ID = "chunkclaim:claim_stick";
const GOLD_BLOCK_ID  = "minecraft:gold_block";
const GOLD_COST      = 2;
const CHUNK_SIZE     = 16;
const DATA_KEY       = "chunkclaim:data";
const LANGUAGE_PROPERTY = "chunkclaim:language";
const LANGUAGE_OPTIONS = ["en", "es", "fr", "ja", "zh_CN"];
const LANGUAGE_NAMES = {
    en: "English",
    es: "Español",
    fr: "Français",
    ja: "日本語",
    zh_CN: "简体中文"
};
const NOTIFICATION_PROPERTY = "chunkclaim:notifications";
const NOTIFICATION_MODES = ["all", "claimed", "off"];
const STATUS_HUD_PROPERTY = "chunkclaim:status_hud";
const STATUS_HUD_MODES = ["on", "off"];
const _playerLanguages = new Map();
const _playerNotifications = new Map();
const _playerStatusHud = new Map();
const TRANSLATIONS = {
    en: {
        language: "Language",
        languageTitle: "Language",
        languageBody: "Choose the language used by ChunkClaim menus.",
        languageSaved: "[ChunkClaim] Language updated.",
        claimManagement: "Claim Management",
        owner: "Owner",
        coOwners: "Co-owners",
        guestPermissions: "Guest permissions",
        editGuestPermissions: "Edit Guest Permissions",
        managePeople: "Manage People",
        chooseManage: "Choose who you want to manage.",
        managePlayers: "Manage Players",
        manageCoOwners: "Manage Co-Owners",
        nameRegion: "Name This Region",
        waypoint: "Waypoint",
        myLands: "My Lands",
        helpGuide: "Help & Guide",
        close: "Close",
        locked: "LOCKED",
        allowBreaking: "Allow Breaking Blocks",
        allowPlacing: "Allow Placing Blocks",
        allowContainers: "Allow Opening Containers / Chests",
        allowDoors: "Allow Using Doors / Gates / Trapdoors",
        allowButtons: "Allow Using Buttons / Levers",
        allowExplosions: "Allow TNT / Explosions",
        breakBlocks: "Break blocks",
        placeBlocks: "Place blocks",
        containers: "Open containers",
        doors: "Use doors/gates",
        buttons: "Buttons/levers",
        explosions: "Explosions/TNT",
        notifications: "Notifications",
        notificationTitle: "Land Notifications",
        notificationBody: "Choose when ChunkClaim shows land status messages.",
        notificationAll: "All land changes",
        notificationClaimed: "Claimed land only",
        notificationOff: "Turn notifications off",
        notificationSaved: "[ChunkClaim] Notification setting updated."
    },
    es: {
        language: "Idioma",
        languageTitle: "Idioma",
        languageBody: "Elige el idioma de los menus de ChunkClaim.",
        languageSaved: "[ChunkClaim] Idioma actualizado.",
        claimManagement: "Gestion de Terreno",
        owner: "Propietario",
        coOwners: "Copropietarios",
        guestPermissions: "Permisos de visitantes",
        editGuestPermissions: "Editar permisos de visitantes",
        managePeople: "Gestionar personas",
        chooseManage: "Elige a quien quieres gestionar.",
        managePlayers: "Gestionar jugadores",
        manageCoOwners: "Gestionar copropietarios",
        nameRegion: "Nombrar esta region",
        waypoint: "Punto de ruta",
        myLands: "Mis terrenos",
        helpGuide: "Ayuda y guia",
        close: "Cerrar",
        locked: "BLOQUEADO",
        allowBreaking: "Permitir romper bloques",
        allowPlacing: "Permitir colocar bloques",
        allowContainers: "Permitir abrir cofres y contenedores",
        allowDoors: "Permitir usar puertas, vallas y trampillas",
        allowButtons: "Permitir usar botones y palancas",
        allowExplosions: "Permitir TNT y explosiones",
        breakBlocks: "Romper bloques",
        placeBlocks: "Colocar bloques",
        containers: "Abrir contenedores",
        doors: "Usar puertas y vallas",
        buttons: "Botones y palancas",
        explosions: "Explosiones y TNT",
        notifications: "Notificaciones",
        notificationTitle: "Notificaciones de terreno",
        notificationBody: "Elige cuando ChunkClaim muestra mensajes de terreno.",
        notificationAll: "Todos los cambios de terreno",
        notificationClaimed: "Solo terreno reclamado",
        notificationOff: "Desactivar notificaciones",
        notificationSaved: "[ChunkClaim] Configuracion de notificaciones actualizada."
    },
    fr: {
        language: "Langue", languageTitle: "Langue", languageBody: "Choisissez la langue des menus ChunkClaim.", languageSaved: "[ChunkClaim] Langue mise a jour.",
        claimManagement: "Gestion de terrain", owner: "Proprietaire", coOwners: "Coproprietaires", guestPermissions: "Permissions des visiteurs", editGuestPermissions: "Modifier les permissions", managePeople: "Gerer les personnes", chooseManage: "Choisissez ce que vous voulez gerer.", managePlayers: "Gerer les joueurs", manageCoOwners: "Gerer les coproprietaires", nameRegion: "Nommer cette region", waypoint: "Point de passage", myLands: "Mes terrains", helpGuide: "Aide et guide", close: "Fermer", locked: "VERROUILLE",
        allowBreaking: "Autoriser la destruction", allowPlacing: "Autoriser la pose de blocs", allowContainers: "Autoriser les coffres et conteneurs", allowDoors: "Autoriser portes, portails et trappes", allowButtons: "Autoriser boutons et leviers", allowExplosions: "Autoriser TNT et explosions",
        breakBlocks: "Casser des blocs", placeBlocks: "Poser des blocs", containers: "Ouvrir les conteneurs", doors: "Utiliser portes et portails", buttons: "Boutons et leviers", explosions: "Explosions et TNT",
        notifications: "Notifications", notificationTitle: "Notifications de terrain", notificationBody: "Choisissez quand ChunkClaim affiche le statut du terrain.", notificationAll: "Tous les changements de terrain", notificationClaimed: "Terrains reclames uniquement", notificationOff: "Desactiver les notifications", notificationSaved: "[ChunkClaim] Parametre de notification mis a jour."
    },
    ja: {
        language: "言語", languageTitle: "言語", languageBody: "ChunkClaim メニューの言語を選択します。", languageSaved: "[ChunkClaim] 言語を更新しました。",
        claimManagement: "土地管理", owner: "所有者", coOwners: "共同所有者", guestPermissions: "訪問者の権限", editGuestPermissions: "訪問者の権限を編集", managePeople: "プレイヤー管理", chooseManage: "管理する項目を選択してください。", managePlayers: "プレイヤーを管理", manageCoOwners: "共同所有者を管理", nameRegion: "地域に名前を付ける", waypoint: "ウェイポイント", myLands: "自分の土地", helpGuide: "ヘルプとガイド", close: "閉じる", locked: "ロック中",
        allowBreaking: "ブロック破壊を許可", allowPlacing: "ブロック設置を許可", allowContainers: "チェストとコンテナを許可", allowDoors: "ドア、ゲート、トラップドアを許可", allowButtons: "ボタンとレバーを許可", allowExplosions: "TNT と爆発を許可",
        breakBlocks: "ブロックを壊す", placeBlocks: "ブロックを置く", containers: "コンテナを開く", doors: "ドアとゲートを使う", buttons: "ボタンとレバー", explosions: "爆発と TNT",
        notifications: "通知", notificationTitle: "土地の通知", notificationBody: "土地の状態を表示するタイミングを選択します。", notificationAll: "すべての土地変更", notificationClaimed: "所有地のみ", notificationOff: "通知をオフにする", notificationSaved: "[ChunkClaim] 通知設定を更新しました。"
    },
    zh_CN: {
        language: "语言", languageTitle: "语言", languageBody: "选择 ChunkClaim 菜单使用的语言。", languageSaved: "[ChunkClaim] 语言已更新。",
        claimManagement: "领地管理", owner: "所有者", coOwners: "共同所有者", guestPermissions: "访客权限", editGuestPermissions: "编辑访客权限", managePeople: "管理人员", chooseManage: "选择要管理的项目。", managePlayers: "管理玩家", manageCoOwners: "管理共同所有者", nameRegion: "命名此区域", waypoint: "传送点", myLands: "我的领地", helpGuide: "帮助与指南", close: "关闭", locked: "已锁定",
        allowBreaking: "允许破坏方块", allowPlacing: "允许放置方块", allowContainers: "允许打开箱子和容器", allowDoors: "允许使用门、栅栏门和活板门", allowButtons: "允许使用按钮和拉杆", allowExplosions: "允许 TNT 和爆炸",
        breakBlocks: "破坏方块", placeBlocks: "放置方块", containers: "打开容器", doors: "使用门和栅栏门", buttons: "按钮和拉杆", explosions: "爆炸和 TNT",
        notifications: "通知", notificationTitle: "领地通知", notificationBody: "选择 ChunkClaim 显示领地状态的时机。", notificationAll: "所有领地变化", notificationClaimed: "仅已认领领地", notificationOff: "关闭通知", notificationSaved: "[ChunkClaim] 通知设置已更新。"
    }
};

function getLanguage(player) {
    const cachedLanguage = _playerLanguages.get(player.id);
    if (cachedLanguage) return cachedLanguage;
    try {
        const language = player.getDynamicProperty(LANGUAGE_PROPERTY);
        if (LANGUAGE_OPTIONS.includes(language)) {
            _playerLanguages.set(player.id, language);
            return language;
        }
    } catch {}
    return "en";
}

function t(player, key) {
    const language = getLanguage(player);
    return TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key;
}

function getNotificationMode(player) {
    const cachedMode = _playerNotifications.get(player.id);
    if (cachedMode) return cachedMode;
    try {
        const mode = player.getDynamicProperty(NOTIFICATION_PROPERTY);
        if (NOTIFICATION_MODES.includes(mode)) {
            _playerNotifications.set(player.id, mode);
            return mode;
        }
    } catch {}
    return "all";
}

function setNotificationMode(player, mode) {
    if (!NOTIFICATION_MODES.includes(mode)) return;
    _playerNotifications.set(player.id, mode);
    try { player.setDynamicProperty(NOTIFICATION_PROPERTY, mode); } catch {}
}

function plainText(value) {
    return String(value).replace(/\u00A7[0-9a-fk-or]/gi, "");
}

// ─── Data Layer ───────────────────────────────────────────────────────────────

let _cache = null;

function loadClaims() {
    if (_cache !== null) return _cache;
    try {
        const raw = world.getDynamicProperty(DATA_KEY);
        _cache = raw ? JSON.parse(String(raw)) : {};
    } catch {
        _cache = {};
    }
    return _cache;
}

function saveClaims(claims) {
    _cache = claims;
    try {
        world.setDynamicProperty(DATA_KEY, JSON.stringify(claims));
    } catch (e) {
        console.error("[ChunkClaim] Save failed:", e);
        world.sendMessage("§c[ChunkClaim] Critical: data save failed!");
    }
}

// ─── Chunk Helpers ────────────────────────────────────────────────────────────

function chunkKey(x, z) {
    return `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`;
}

function chunkFromKey(key) {
    const [cx, cz] = key.split(",").map(Number);
    return { cx, cz };
}

function getClaimAt(x, z) {
    return loadClaims()[chunkKey(x, z)] ?? null;
}

function defaultPerms() {
    return {
        breakBlocks: false,
        placeBlocks:  false,
        openChests:   false,
        useDoors:     false,
        useButtons:   false,
        explosions:   false
    };
}

// ─── Connected Claims (BFS flood fill) ────────────────────────────────────────

function getConnectedClaims(startKey, ownerId) {
    const claims = loadClaims();
    const found  = new Set();
    const queue  = [startKey];
    let head = 0;

    while (head < queue.length && found.size < 500) {
        const key = queue[head++];
        if (found.has(key)) continue;
        if (claims[key]?.owner !== ownerId) continue;
        found.add(key);

        const { cx, cz } = chunkFromKey(key);
        for (const nk of [`${cx},${cz-1}`, `${cx},${cz+1}`, `${cx-1},${cz}`, `${cx+1},${cz}`]) {
            if (!found.has(nk)) queue.push(nk);
        }
    }
    return [...found];
}

// ─── Inventory Helpers ────────────────────────────────────────────────────────

function countItems(player, typeId) {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return 0;
    let total = 0;
    for (let i = 0; i < inv.container.size; i++) {
        const item = inv.container.getItem(i);
        if (item?.typeId === typeId) total += item.amount;
    }
    return total;
}

function removeItems(player, typeId, amount) {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return false;
    let remaining = amount;
    for (let i = 0; i < inv.container.size && remaining > 0; i++) {
        const item = inv.container.getItem(i);
        if (item?.typeId !== typeId) continue;
        if (item.amount <= remaining) {
            remaining -= item.amount;
            inv.container.setItem(i, undefined);
        } else {
            inv.container.setItem(i, new ItemStack(typeId, item.amount - remaining));
            remaining = 0;
        }
    }
    return remaining === 0;
}

function getInventoryContainer(player) {
    return player.getComponent("minecraft:inventory")?.container;
}

function refundItem(player, itemStack) {
    if (!itemStack) return;

    const container = getInventoryContainer(player);
    if (container) {
        try {
            const leftover = container.addItem(itemStack);
            if (!leftover) return;
            player.dimension.spawnItem(leftover, player.location);
            return;
        } catch {}
    }

    try {
        player.dimension.spawnItem(itemStack, player.location);
    } catch {}
}

// ─── Visual Border ────────────────────────────────────────────────────────────

// ─── Permission & Role Helpers ────────────────────────────────────────────────

function isCoOwnerOfClaim(claim, playerId) {
    return (claim.coOwners ?? []).some(co => co.id === playerId);
}

function getEffectivePerms(claim, playerId) {
    const playerPerms = (claim.players ?? {})[playerId];
    return playerPerms ?? claim.permissions;
}

function getHudPermissions(claim, player) {
    if (!claim) return "§7Permissions: §8N/A";
    if (claim.owner === player.id) return "§7Permissions: §aFull access (Owner)";
    if (isCoOwnerOfClaim(claim, player.id)) return "§7Permissions: §aFull access (Co-Owner)";

    const perms = getEffectivePerms(claim, player.id);
    const allowed = [
        perms.breakBlocks && "Break",
        perms.placeBlocks && "Place",
        perms.openChests && "Containers",
        perms.useDoors && "Doors/Gates",
        perms.useButtons && "Buttons/Levers",
        perms.explosions && "Explosions"
    ].filter(Boolean);
    return allowed.length > 0
        ? `§7Permissions: §a${allowed.join(", ")}`
        : "§7Permissions: §cNo guest actions";
}

function buildPersonalHud(player, key, claim) {
    const ownedChunkCount = Object.values(loadClaims())
        .filter((entry) => entry?.owner === player.id).length;
    const lines = [
        `§6§lChunkClaim §r§7| §f${player.name}`,
        `§7Owned chunks: §a${ownedChunkCount} §8| §7Current: §f${key}`
    ];

    if (!claim) {
        lines.push("§7Status: §aUnclaimed");
        lines.push("§7Role: §8None");
        return `CC_HUD:${lines.join("\n")}`;
    }

    const isOwner = claim.owner === player.id;
    const isCoOwner = isCoOwnerOfClaim(claim, player.id);
    const role = isOwner ? "§aOwner" : isCoOwner ? "§bCo-Owner" : "§cGuest";
    const status = isOwner ? "§aYour claim" : `§cClaimed by §f${plainText(claim.ownerName)}`;

    lines.push(`§7Status: ${status}`);
    if (claim.regionName) lines.push(`§7Region: §6${plainText(claim.regionName)}`);
    lines.push(`§7Role: ${role}`);
    lines.push(getHudPermissions(claim, player));
    return `CC_HUD:${lines.join("\n")}`;
}

function showPersonalHud(player, key, claim) {
    try {
        player.onScreenDisplay.setTitle(buildPersonalHud(player, key, claim), {
            fadeInDuration: 0,
            stayDuration: 0,
            fadeOutDuration: 0
        });
    } catch {}
}

function removeLegacyChunkClaimScoreboard() {
    try {
        const objective = world.scoreboard.getObjective("chunkclaim_claims");
        if (objective) world.scoreboard.removeObjective(objective);
    } catch {}
}

function isAdmin(player) {
    try {
        if (typeof player.permissionLevel === "number") return player.permissionLevel >= 2;
    } catch {}
    return player.hasTag("op");
}

function broadcastToAdmins(message) {
    for (const p of world.getAllPlayers()) {
        if (isAdmin(p)) p.sendMessage(message);
    }
}

// ─── UI: Main Management Panel ───────────────────────────────────────────────

async function openLanguageUI(player, returnTo) {
    let result;
    try {
        const form = new ActionFormData()
            .title(`§f§l${t(player, "languageTitle")}`)
            .body(`§7${t(player, "languageBody")}`);
        for (const language of LANGUAGE_OPTIONS) form.button(LANGUAGE_NAMES[language]);
        form.button(t(player, "close"));
        result = await form.show(player);
    } catch { return; }

    if (result.canceled || result.selection == null || result.selection >= LANGUAGE_OPTIONS.length) return;
    const language = LANGUAGE_OPTIONS[result.selection];
    _playerLanguages.set(player.id, language);
    try { player.setDynamicProperty(LANGUAGE_PROPERTY, language); } catch {}
    player.sendMessage(`§a${t(player, "languageSaved")}`);
    if (returnTo) returnTo();
}

async function openNotificationUI(player, returnTo) {
    let result;
    try {
        result = await new ActionFormData()
            .title(t(player, "notificationTitle"))
            .body(t(player, "notificationBody"))
            .button(t(player, "notificationAll"))
            .button(t(player, "notificationClaimed"))
            .button(t(player, "notificationOff"))
            .button(t(player, "close"))
            .show(player);
    } catch { return; }

    if (result.canceled || result.selection == null || result.selection >= NOTIFICATION_MODES.length) return;
    setNotificationMode(player, NOTIFICATION_MODES[result.selection]);
    player.sendMessage(`§a${t(player, "notificationSaved")}`);
    if (returnTo) returnTo();
}

function getStatusHudEnabled(player) {
    const cached = _playerStatusHud.get(player.id);
    if (cached !== undefined) return cached;
    try {
        const mode = player.getDynamicProperty(STATUS_HUD_PROPERTY);
        if (STATUS_HUD_MODES.includes(mode)) {
            const enabled = mode === "on";
            _playerStatusHud.set(player.id, enabled);
            return enabled;
        }
    } catch {}
    return false;
}

function setStatusHudEnabled(player, enabled) {
    _playerStatusHud.set(player.id, enabled);
    try { player.setDynamicProperty(STATUS_HUD_PROPERTY, enabled ? "on" : "off"); } catch {}
}

// This screen deliberately contains only per-player preferences, so it is safe
// to open anywhere without a Claim Stick or a claim selected.
async function openPlayerSettingsUI(player) {
    let result;
    try {
        result = await new ActionFormData()
            .title("ChunkClaim Settings")
            .body("Configure your personal ChunkClaim preferences.")
            .button(t(player, "notifications"))
            .button(t(player, "language"))
            .button(`Land HUD: ${getStatusHudEnabled(player) ? "§aON" : "§cOFF"}`)
            .button(t(player, "close"))
            .show(player);
    } catch { return; }

    if (result.canceled || result.selection == null) return;
    if (result.selection === 0) return openNotificationUI(player, () => openPlayerSettingsUI(player));
    if (result.selection === 1) return openLanguageUI(player, () => openPlayerSettingsUI(player));
    if (result.selection === 2) {
        const enabled = !getStatusHudEnabled(player);
        setStatusHudEnabled(player, enabled);
        if (!enabled) player.onScreenDisplay.setTitle("CC_HUD:OFF", { fadeInDuration: 0, stayDuration: 0, fadeOutDuration: 0 });
        player.sendMessage(enabled
            ? "§a[ChunkClaim] Personal land HUD enabled."
            : "§7[ChunkClaim] Personal land HUD disabled.");
        return openPlayerSettingsUI(player);
    }
}

async function openManagementUI(player, claim, key) {
    const connected = getConnectedClaims(key, claim.owner);
    const count     = connected.length;
    const p         = claim.permissions;
    const isOwner   = claim.owner === player.id;
    const coOwners  = claim.coOwners ?? [];
    const locked    = claim.locked ?? false;

    const on = (b) => b ? "§aON" : "§cOFF";
    const permLines = [
        `§r§f  ${t(player, "breakBlocks")}: ${on(p.breakBlocks)}`,
        `§r§f  ${t(player, "placeBlocks")}: ${on(p.placeBlocks)}`,
        `§r§f  ${t(player, "containers")}: ${on(p.openChests)}`,
        `§r§f  ${t(player, "doors")}: ${on(p.useDoors)}`,
        `§r§f  ${t(player, "buttons")}: ${on(p.useButtons)}`,
        `§r§f  ${t(player, "explosions")}: ${on(p.explosions)}`
    ].join("\n");

    const regionName   = claim.regionName ? `§6${claim.regionName}` : null;
    const header       = regionName
        ? `${regionName} §7(${count} chunk${count !== 1 ? "s" : ""})`
        : count > 1 ? `§7Connected region: §f${count} chunks` : `§7Chunk: §f${key}`;
    const coOwnerLine  = coOwners.length > 0 ? `\n§7${t(player, "coOwners")}: §f${coOwners.length}` : "";
    const lockLine     = locked ? `\n§c§l${t(player, "locked")}` : "";
    const footer       = count > 1 ? `\n§7Edits apply to §fall ${count} connected chunks§7.` : "";

    const form = new ActionFormData()
        .title(`§f§l${t(player, "claimManagement")}`)
        .body(`${header}\n§7${t(player, "owner")}: §f${claim.ownerName}${coOwnerLine}${lockLine}\n\n§7${t(player, "guestPermissions")}:\n${permLines}${footer}`);

    const actions = [];

    if (isOwner && locked) {
        form.button(`${t(player, "editGuestPermissions")} [${t(player, "locked")}]`);
        actions.push(() => player.sendMessage("§c[ChunkClaim] This claim is locked. Contact an admin to unlock."));
    } else {
        form.button(`${t(player, "editGuestPermissions")}`);
        actions.push(() => openPermissionsUI(player, claim, key, connected));
    }

    form.button(`${t(player, "managePeople")}`);
    actions.push(() => openPeopleUI(player, claim, key));

    if (isOwner && !locked) {
        form.button(`${t(player, "nameRegion")}`);
        actions.push(() => openNameRegionUI(player, claim, key, connected));
    }

    if (isOwner && !locked) {
        const wpPublic = claim.waypointPublic ?? false;
        const wpShared = (claim.waypointAllowed ?? []).length;
        const wpAccess = wpPublic ? "§aPublic" : wpShared > 0 ? `§e${wpShared} shared` : "§7Private";
        const wpSet    = claim.waypoint ? "§aSet" : "§8None";
        form.button(plainText(`${t(player, "waypoint")} (${wpSet}, ${wpAccess})`));
        actions.push(() => openWaypointSettingsUI(player, claim, key, connected));
    }

    form.button(`${t(player, "myLands")}`);
    actions.push(() => openWaypointUI(player));

    if (isOwner && !locked) {
        form.button(count > 1 ? `Unclaim All ${count} Chunks` : "Unclaim This Chunk");
        actions.push(() => openUnclaimUI(player, key, connected));
    }

    form.button(`${t(player, "helpGuide")}`);
    actions.push(() => openGuideUI(player));

    form.button(`${t(player, "notifications")}`);
    actions.push(() => openNotificationUI(player, () => openManagementUI(player, claim, key)));

    form.button(`${t(player, "language")}`);
    actions.push(() => openLanguageUI(player, () => openManagementUI(player, claim, key)));

    form.button(`${t(player, "close")}`);
    actions.push(() => {});

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection == null) return;
    actions[result.selection]?.();
}

// ─── UI: Permission Toggles ───────────────────────────────────────────────────

async function openPeopleUI(player, claim, key) {
    let result;
    try {
        result = await new ActionFormData()
            .title(t(player, "managePeople"))
            .body(t(player, "chooseManage"))
            .button(t(player, "managePlayers"))
            .button(t(player, "manageCoOwners"))
            .button(t(player, "close"))
            .show(player);
    } catch { return; }

    if (result.canceled || result.selection == null) return;
    if (result.selection === 0) return openPlayerListUI(player, claim, key);
    if (result.selection === 1) return openCoOwnerUI(player, claim, key);
    openManagementUI(player, claim, key);
}

async function openPermissionsUI(player, claim, key, connectedKeys) {
    const p        = claim.permissions;
    const count    = connectedKeys.length;
    const subtitle = count > 1 ? ` (${count} chunks)` : ` — ${key}`;

    let result;
    try {
        result = await new ModalFormData()
            .title(`§f§l${t(player, "guestPermissions")}${subtitle}`)
            .toggle(t(player, "allowBreaking"),              { defaultValue: p.breakBlocks })
            .toggle(t(player, "allowPlacing"),               { defaultValue: p.placeBlocks })
            .toggle(t(player, "allowContainers"),            { defaultValue: p.openChests })
            .toggle(t(player, "allowDoors"),                 { defaultValue: p.useDoors })
            .toggle(t(player, "allowButtons"),               { defaultValue: p.useButtons })
            .toggle(t(player, "allowExplosions"),            { defaultValue: p.explosions })
            .show(player);
    } catch { return; }

    if (result.canceled || !result.formValues) return;

    const [breakBlocks, placeBlocks, openChests, useDoors, useButtons, explosions] = result.formValues;
    const newPerms = { breakBlocks, placeBlocks, openChests, useDoors, useButtons, explosions };

    const claims = loadClaims();
    let updated = 0;
    for (const ck of connectedKeys) {
        if (claims[ck]?.owner === claim.owner) {
            claims[ck].permissions = { ...newPerms };
            updated++;
        }
    }
    saveClaims(claims);

    player.sendMessage(
        updated > 1
            ? `§a[ChunkClaim] Permissions updated for §f${updated} chunks§a.`
            : "§a[ChunkClaim] Permissions updated."
    );
}

// ─── UI: Unclaim Confirmation ─────────────────────────────────────────────────

async function openUnclaimUI(player, key, connectedKeys) {
    const count = connectedKeys.length;

    let keysToRemove = connectedKeys;

    if (count > 1) {
        let pick;
        try {
            pick = await new ActionFormData()
                .title("§c§lUnclaim Land?")
                .body(`§7This region has §f${count} chunks§7. What do you want to unclaim?\n\n§cGold Blocks are §lNOT§r§c refunded.`)
                .button("Just This Chunk")
                .button(`All ${count} Connected Chunks`)
                .button("✕ Cancel")
                .show(player);
        } catch { return; }

        if (pick.canceled || pick.selection === 2) return;
        keysToRemove = pick.selection === 0 ? [key] : connectedKeys;
    }

    const removeCount = keysToRemove.length;
    const target      = removeCount > 1 ? `§fall ${removeCount}§c connected chunks` : `chunk §f${key}`;

    let confirm;
    try {
        confirm = await new ActionFormData()
            .title("§c§lConfirm Unclaim")
            .body(`§cUnclaim ${target}?\n\n§cGold Blocks are §lNOT§r§c refunded.`)
            .button("Yes, Unclaim")
            .button("✕ Cancel")
            .show(player);
    } catch { return; }

    if (confirm.canceled || confirm.selection !== 0) return;

    const claims = loadClaims();
    let removed  = 0;
    for (const ck of keysToRemove) {
        if (claims[ck]?.owner === player.id) { delete claims[ck]; removed++; }
    }
    saveClaims(claims);

    player.sendMessage(
        removed > 1
            ? `§a[ChunkClaim] Unclaimed §f${removed} chunks§a.`
            : `§a[ChunkClaim] Unclaimed chunk §f${key}§a.`
    );
}

// ─── UI: Player List (Per-Player Permissions) ─────────────────────────────────

async function openPlayerListUI(player, claim, key) {
    const online = world.getAllPlayers().filter(p => p.id !== claim.owner);

    if (online.length === 0) {
        player.sendMessage("§7[ChunkClaim] No other players are online.");
        return;
    }

    const form = new ActionFormData()
        .title("§6§lManage Player Permissions")
        .body("§7Select a player to configure their permissions in this chunk.");

    for (const p of online) {
        const hasCustom = !!(claim.players ?? {})[p.id];
        form.button(`${p.name}${hasCustom ? " [Custom]" : ""}`);
    }
    form.button("✕ Close");

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection == null || result.selection === online.length) return;
    openPlayerPermissionsUI(player, claim, key, online[result.selection]);
}

// ─── UI: Per-Player Permission Toggles ───────────────────────────────────────

async function openPlayerPermissionsUI(player, claim, key, targetPlayer) {
    const existing = (claim.players ?? {})[targetPlayer.id] ?? defaultPerms();

    let result;
    try {
        result = await new ModalFormData()
            .title(`§f§l${targetPlayer.name}'s ${t(player, "guestPermissions")}`)
            .toggle(t(player, "allowBreaking"),              { defaultValue: existing.breakBlocks })
            .toggle(t(player, "allowPlacing"),               { defaultValue: existing.placeBlocks })
            .toggle(t(player, "allowContainers"),            { defaultValue: existing.openChests })
            .toggle(t(player, "allowDoors"),                 { defaultValue: existing.useDoors })
            .toggle(t(player, "allowButtons"),               { defaultValue: existing.useButtons })
            .toggle(t(player, "allowExplosions"),            { defaultValue: existing.explosions })
            .show(player);
    } catch { return; }

    if (result.canceled || !result.formValues) return;

    const [breakBlocks, placeBlocks, openChests, useDoors, useButtons, explosions] = result.formValues;
    const newPerms = { breakBlocks, placeBlocks, openChests, useDoors, useButtons, explosions };

    const claims = loadClaims();
    if (!claims[key]) return;
    if (!claims[key].players) claims[key].players = {};
    claims[key].players[targetPlayer.id] = newPerms;
    saveClaims(claims);

    player.sendMessage(`§a[ChunkClaim] Updated permissions for §f${targetPlayer.name}§a in chunk §f${key}§a.`);
}

// ─── UI: Co-Owner Management ──────────────────────────────────────────────────

async function openCoOwnerUI(player, claim, key) {
    const connected    = getConnectedClaims(key, claim.owner);
    const coOwners     = claim.coOwners ?? [];
    const coOwnerNames = coOwners.map(co => co.name).join(", ") || "None";

    const form = new ActionFormData()
        .title("§6§lManage Co-Owners")
        .body(`§7Current co-owners: §f${coOwnerNames}`)
        .button("Add Co-Owner")
        .button("Remove Co-Owner")
        .button("Close");

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection === 2) return;
    if (result.selection === 0) return openAddCoOwnerUI(player, claim, key, connected);
    if (result.selection === 1) return openRemoveCoOwnerUI(player, claim, key, connected);
}

async function openAddCoOwnerUI(player, claim, key, connected) {
    const coOwnerIds = new Set((claim.coOwners ?? []).map(co => co.id));
    const candidates = world.getAllPlayers().filter(p => p.id !== claim.owner && !coOwnerIds.has(p.id));

    if (candidates.length === 0) {
        player.sendMessage("§7[ChunkClaim] No eligible players online to add as co-owner.");
        return;
    }

    const form = new ActionFormData()
        .title("§6§lAdd Co-Owner")
        .body("§7Select a player to add as co-owner.");

    for (const p of candidates) form.button(p.name);
    form.button("Back");

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection === candidates.length) return;

    const target = candidates[result.selection];
    const claims = loadClaims();
    for (const ck of connected) {
        if (!claims[ck]) continue;
        if (!claims[ck].coOwners) claims[ck].coOwners = [];
        if (!claims[ck].coOwners.some(co => co.id === target.id)) {
            claims[ck].coOwners.push({ id: target.id, name: target.name });
        }
    }
    saveClaims(claims);
    player.sendMessage(`§a[ChunkClaim] §f${target.name}§a added as co-owner.`);
}

async function openRemoveCoOwnerUI(player, claim, key, connected) {
    const coOwners = claim.coOwners ?? [];

    if (coOwners.length === 0) {
        player.sendMessage("§7[ChunkClaim] This claim has no co-owners.");
        return;
    }

    const form = new ActionFormData()
        .title("§6§lRemove Co-Owner")
        .body("§7Select a co-owner to remove.");

    for (const co of coOwners) form.button(co.name);
    form.button("Back");

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection === coOwners.length) return;

    const target = coOwners[result.selection];
    const claims = loadClaims();
    for (const ck of connected) {
        if (!claims[ck]?.coOwners) continue;
        claims[ck].coOwners = claims[ck].coOwners.filter(co => co.id !== target.id);
    }
    saveClaims(claims);
    player.sendMessage(`§a[ChunkClaim] §f${target.name}§a removed as co-owner.`);
}

// ─── UI: Admin Panel ──────────────────────────────────────────────────────────

async function openAdminUI(player, claim, key) {
    const hasClaim = claim != null;

    const bodyText = hasClaim
        ? `§7Chunk: §f${key}\n§7Owner: §f${claim.ownerName}\n§7Co-owners: §f${(claim.coOwners ?? []).length}\n§7Locked: ${claim.locked ? "§cYES" : "§aNo"}`
        : `§7Chunk: §f${key}\n§8(Unclaimed)`;

    const form = new ActionFormData()
        .title("§c§l[Admin] ChunkClaim")
        .body(bodyText);

    const actions = [];

    if (hasClaim) {
        form.button("View Claim Info");
        actions.push(() => openAdminViewInfoUI(player, claim, key));

        form.button("Delete This Claim");
        actions.push(() => openAdminDeleteClaimUI(player, claim, key));

        form.button("Teleport to Claim");
        actions.push(() => {
            const { cx, cz } = chunkFromKey(key);
            const cx16 = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
            const cz16 = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
            const sy   = getSurfaceY(player.dimension, cx16, cz16, player.location.y);
            try {
                player.teleport({ x: cx16, y: sy, z: cz16 });
                player.sendMessage(`§a[Admin] Teleported to chunk §f${key}§a.`);
            } catch {
                player.sendMessage("§c[Admin] Teleport failed.");
            }
        });

        form.button("Force Add Co-Owner");
        actions.push(() => openAdminForceCoOwnerUI(player, claim, key));

        const lockLabel = claim.locked ? "§6Toggle Claim Lock §7(§cLOCKED§7)" : "§6Toggle Claim Lock §7(§aUNLOCKED§7)";
        form.button(plainText(lockLabel));
        actions.push(() => {
            const connected  = getConnectedClaims(key, claim.owner);
            const claims     = loadClaims();
            const newLocked  = !(claim.locked ?? false);
            for (const ck of connected) {
                if (claims[ck]) claims[ck].locked = newLocked;
            }
            saveClaims(claims);
            const status = newLocked ? "§cLOCKED" : "§aUNLOCKED";
            player.sendMessage(`§a[Admin] Claim §f${key}§a is now ${status}§a.`);
            broadcastToAdmins(`§c[ChunkClaim Admin] ${player.name} ${newLocked ? "locked" : "unlocked"} ${claim.ownerName}'s claim at ${key}`);
        });
    }

    form.button("Browse Player Lands");
    actions.push(() => openAdminBrowseLandsUI(player));

    form.button("Delete All Claims By Player");
    actions.push(() => openAdminDeleteByPlayerUI(player));

    form.button("[?] Help & Guide");
    actions.push(() => openGuideUI(player));

    form.button("✕ Close");
    actions.push(() => {});

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection == null) return;
    actions[result.selection]?.();
}

async function openAdminViewInfoUI(player, claim, key) {
    const connected        = getConnectedClaims(key, claim.owner);
    const coOwnerNames     = (claim.coOwners ?? []).map(co => co.name).join(", ") || "None";
    const playerPermCount  = Object.keys(claim.players ?? {}).length;
    const p                = claim.permissions;
    const on               = (b) => b ? "§aON" : "§cOFF";

    const permText = [
        `§r§f  Break blocks:    ${on(p.breakBlocks)}`,
        `§r§f  Place blocks:    ${on(p.placeBlocks)}`,
        `§r§f  Open containers: ${on(p.openChests)}`,
        `§r§f  Use doors/gates: ${on(p.useDoors)}`,
        `§r§f  Buttons/levers:  ${on(p.useButtons)}`,
        `§r§f  Explosions/TNT:  ${on(p.explosions)}`
    ].join("\n");

    try {
        await new ActionFormData()
            .title("§e§lClaim Info")
            .body(
                `§7Chunk: §f${key}\n` +
                `§7Owner: §f${claim.ownerName} §8(${claim.owner})\n` +
                (claim.regionName ? `§7Region Name: §6${claim.regionName}\n` : "") +
                `§7Co-owners: §f${coOwnerNames}\n` +
                `§7Chunks in region: §f${connected.length}\n` +
                `§7Locked: ${claim.locked ? "§cYES" : "§aNo"}\n` +
                `§7Custom player perms: §f${playerPermCount}\n\n` +
                `§7Guest permissions:\n${permText}`
            )
            .button("✕ Close")
            .show(player);
    } catch {}
}

async function openAdminDeleteClaimUI(player, claim, key) {
    const connected = getConnectedClaims(key, claim.owner);

    let result;
    try {
        result = await new ActionFormData()
            .title("§c§lDelete Claim?")
            .body(`§cDelete §f${claim.ownerName}§c's claim at §f${key}§c?\n§7This removes §f${connected.length} chunk(s)§7. No gold refunded.`)
            .button("Yes, Delete")
            .button("Cancel")
            .show(player);
    } catch { return; }

    if (result.canceled || result.selection !== 0) return;

    const claims = loadClaims();
    let removed = 0;
    for (const ck of connected) {
        if (claims[ck]) { delete claims[ck]; removed++; }
    }
    saveClaims(claims);

    broadcastToAdmins(`§c[ChunkClaim Admin] ${player.name} deleted ${claim.ownerName}'s claim at ${key} (${removed} chunk(s))`);
    player.sendMessage(`§a[Admin] Deleted §f${removed} chunk(s)§a.`);
}

async function openAdminDeleteByPlayerUI(player) {
    const claims   = loadClaims();
    const ownerMap = new Map();

    for (const claim of Object.values(claims)) {
        const id = claim.owner;
        if (!ownerMap.has(id)) ownerMap.set(id, { name: claim.ownerName, count: 0 });
        ownerMap.get(id).count++;
    }

    if (ownerMap.size === 0) {
        player.sendMessage("§7[Admin] No claims exist.");
        return;
    }

    const owners = [...ownerMap.entries()];

    const form = new ActionFormData()
        .title("§c§lDelete All Claims By Player")
        .body("§7Select a player to wipe all their claims.");

    for (const [, { name, count }] of owners) {
        form.button(`${name} (${count} chunk${count !== 1 ? "s" : ""})`);
    }
    form.button("Cancel");

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection === owners.length) return;

    const [targetId, { name: targetName, count: targetCount }] = owners[result.selection];

    let confirm;
    try {
        confirm = await new ActionFormData()
            .title("§c§lConfirm Wipe")
            .body(`§cDelete §lALL §r§c${targetCount} claim(s) by §f${targetName}§c?\n§7This cannot be undone.`)
            .button("Yes, Wipe All")
            .button("Cancel")
            .show(player);
    } catch { return; }

    if (confirm.canceled || confirm.selection !== 0) return;

    const freshClaims = loadClaims();
    let removed = 0;
    for (const ck of Object.keys(freshClaims)) {
        if (freshClaims[ck].owner === targetId) { delete freshClaims[ck]; removed++; }
    }
    saveClaims(freshClaims);

    broadcastToAdmins(`§c[ChunkClaim Admin] ${player.name} wiped all ${removed} claim(s) by ${targetName}`);
    player.sendMessage(`§a[Admin] Wiped §f${removed} chunk(s)§a owned by §f${targetName}§a.`);
}

async function openAdminForceCoOwnerUI(player, claim, key) {
    const coOwnerIds = new Set((claim.coOwners ?? []).map(co => co.id));
    const candidates = world.getAllPlayers().filter(p => p.id !== claim.owner && !coOwnerIds.has(p.id));

    if (candidates.length === 0) {
        player.sendMessage("§7[Admin] No eligible online players to add as co-owner.");
        return;
    }

    const form = new ActionFormData()
        .title("§d§lForce Add Co-Owner")
        .body(`§7Adding co-owner to §f${claim.ownerName}§7's claim at §f${key}§7.`);

    for (const p of candidates) form.button(p.name);
    form.button("Cancel");

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection === candidates.length) return;

    const target    = candidates[result.selection];
    const connected = getConnectedClaims(key, claim.owner);
    const claims    = loadClaims();

    for (const ck of connected) {
        if (!claims[ck]) continue;
        if (!claims[ck].coOwners) claims[ck].coOwners = [];
        if (!claims[ck].coOwners.some(co => co.id === target.id)) {
            claims[ck].coOwners.push({ id: target.id, name: target.name });
        }
    }
    saveClaims(claims);

    broadcastToAdmins(`§c[ChunkClaim Admin] ${player.name} force-added ${target.name} as co-owner to ${claim.ownerName}'s claim at ${key}`);
    player.sendMessage(`§a[Admin] Added §f${target.name}§a as co-owner to §f${claim.ownerName}§a's claim.`);
}

// ─── Region Naming ────────────────────────────────────────────────────────────

async function openNameRegionUI(player, claim, key, connected) {
    let result;
    try {
        result = await new ModalFormData()
            .title("§6§lName This Region")
            .textField("Region name (leave blank to clear)", "e.g. My Base", { defaultValue: claim.regionName ?? "" })
            .show(player);
    } catch { return; }

    if (result.canceled || !result.formValues) return;

    const newName = String(result.formValues[0]).trim().slice(0, 32);
    const claims  = loadClaims();
    for (const ck of connected) {
        if (claims[ck]?.owner === claim.owner) claims[ck].regionName = newName || null;
    }
    saveClaims(claims);

    player.sendMessage(newName
        ? `§a[ChunkClaim] Region named: §6${newName}§a.`
        : "§a[ChunkClaim] Region name cleared."
    );
}

// ─── Set Waypoint ─────────────────────────────────────────────────────────────

async function openSetWaypointUI(player, claim, key, connected) {
    const pos = player.location;
    const isNether = player.dimension.id === "minecraft:nether";

    if (isNether && pos.y >= 127) {
        player.sendMessage("§c[ChunkClaim] Cannot set a waypoint on the nether roof.");
        return;
    }

    const safe = findSafeSpot(player.dimension, pos.x, pos.y, pos.z);
    if (!safe) {
        player.sendMessage("§c[ChunkClaim] No safe spot found here. Stand on solid, safe ground (not water or lava).");
        return;
    }

    const fx = Math.floor(safe.x);
    const fy = Math.floor(safe.y);
    const fz = Math.floor(safe.z);

    let result;
    try {
        result = await new ActionFormData()
            .title("§6§lSet Waypoint")
            .body(
                `§7Set the teleport destination for this region?\n\n` +
                `§fX: §7${fx}  Y: §7${fy}  Z: §7${fz}\n\n` +
                `§8Players will land here when using §7My Lands§8.`
            )
            .button("Set Waypoint Here")
            .button("✕ Cancel")
            .show(player);
    } catch { return; }

    if (result.canceled || result.selection !== 0) return;

    const claims = loadClaims();
    for (const ck of connected) {
        if (claims[ck]?.owner === claim.owner) {
            claims[ck].waypoint = { x: safe.x, y: safe.y, z: safe.z };
        }
    }
    saveClaims(claims);
    player.sendMessage(`§a[ChunkClaim] Waypoint set to §f${fx}, ${fy}, ${fz}§a.`);
}

// ─── Waypoint Settings (sub-menu) ────────────────────────────────────────────

async function openWaypointSettingsUI(player, claim, key, connected) {
    const isPublic = claim.waypointPublic ?? false;
    const shared   = (claim.waypointAllowed ?? []).length;
    const wpAccess = isPublic ? "§aPublic" : shared > 0 ? `§e${shared} shared` : "§7Private";

    let result;
    try {
        result = await new ActionFormData()
            .title("§6§lWaypoint Settings")
            .body(
                `§7Waypoint: ${claim.waypoint ? "§aSet" : "§8Not set"}\n` +
                `§7Access: ${wpAccess}`
            )
            .button("⚑ Set Waypoint Here")
            .button(plainText(`⬡ Waypoint Access  ${wpAccess}`))
            .button("✕ Close")
            .show(player);
    } catch { return; }

    if (result.canceled || result.selection === 2) return;
    if (result.selection === 0) openSetWaypointUI(player, claim, key, connected);
    if (result.selection === 1) openWaypointAccessUI(player, claim, key, connected);
}

// ─── Waypoint Access ──────────────────────────────────────────────────────────

async function openWaypointAccessUI(player, claim, key, connected) {
    const isPublic = claim.waypointPublic ?? false;
    const allowed  = claim.waypointAllowed ?? [];

    const on = (b) => b ? "§aON" : "§cOFF";
    let result;
    try {
        result = await new ActionFormData()
            .title("§6§lWaypoint Access")
            .body(
                `§7Control who can teleport to this region via §fMy Lands§7.\n\n` +
                `§7Public (anyone): ${on(isPublic)}\n` +
                `§7Shared with: §f${allowed.length} player${allowed.length !== 1 ? "s" : ""}`
            )
            .button(isPublic ? "Make Private" : "Make Public  (anyone can TP)")
            .button("Grant Access to Player")
            .button(`Revoke Player Access ${allowed.length > 0 ? `(${allowed.length})` : ""}`)
            .button("✕ Close")
            .show(player);
    } catch { return; }

    if (result.canceled || result.selection === 3) return;

    if (result.selection === 0) {
        const newPublic = !isPublic;
        const claims = loadClaims();
        for (const ck of connected) {
            if (claims[ck]?.owner === claim.owner) claims[ck].waypointPublic = newPublic;
        }
        saveClaims(claims);
        player.sendMessage(newPublic
            ? "§a[ChunkClaim] Waypoint is now §2public§a — anyone can teleport here via My Lands."
            : "§a[ChunkClaim] Waypoint is now §cprivate§a.");
    } else if (result.selection === 1) {
        openAddWaypointAccessUI(player, claim, key, connected);
    } else if (result.selection === 2) {
        if (allowed.length === 0) {
            player.sendMessage("§7[ChunkClaim] No players have been granted waypoint access.");
            return;
        }
        openRevokeWaypointAccessUI(player, claim, key, connected);
    }
}

async function openAddWaypointAccessUI(player, claim, key, connected) {
    const existingIds = new Set([
        claim.owner,
        ...(claim.coOwners      ?? []).map(co => co.id),
        ...(claim.waypointAllowed ?? []).map(p  => p.id)
    ]);
    const candidates = world.getAllPlayers().filter(p => !existingIds.has(p.id));

    if (candidates.length === 0) {
        player.sendMessage("§7[ChunkClaim] No eligible online players to grant access to.");
        return;
    }

    const form = new ActionFormData()
        .title("§6§lGrant Waypoint Access")
        .body("§7Select a player to let them teleport to this region via My Lands.");

    for (const p of candidates) form.button(p.name);
    form.button("Back");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection === candidates.length) return;

    const target = candidates[result.selection];
    const claims = loadClaims();
    for (const ck of connected) {
        if (!claims[ck]) continue;
        if (!claims[ck].waypointAllowed) claims[ck].waypointAllowed = [];
        if (!claims[ck].waypointAllowed.some(p => p.id === target.id)) {
            claims[ck].waypointAllowed.push({ id: target.id, name: target.name });
        }
    }
    saveClaims(claims);
    player.sendMessage(`§a[ChunkClaim] §f${target.name}§a can now teleport to this region via My Lands.`);
}

async function openRevokeWaypointAccessUI(player, claim, key, connected) {
    const allowed = claim.waypointAllowed ?? [];

    const form = new ActionFormData()
        .title("§6§lRevoke Waypoint Access")
        .body("§7Select a player to remove their teleport access.");

    for (const p of allowed) form.button(p.name);
    form.button("Back");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection === allowed.length) return;

    const target = allowed[result.selection];
    const claims = loadClaims();
    for (const ck of connected) {
        if (!claims[ck]?.waypointAllowed) continue;
        claims[ck].waypointAllowed = claims[ck].waypointAllowed.filter(p => p.id !== target.id);
    }
    saveClaims(claims);
    player.sendMessage(`§a[ChunkClaim] §f${target.name}§a's waypoint access removed.`);
}

// ─── Waypoints (My Lands) ─────────────────────────────────────────────────────

function getMyRegions(playerId) {
    const claims  = loadClaims();
    const visited = new Set();
    const regions = [];

    for (const [key, claim] of Object.entries(claims)) {
        const isOwner   = claim.owner === playerId;
        const isCoOwner = (claim.coOwners ?? []).some(co => co.id === playerId);
        if (!isOwner && !isCoOwner) continue;
        if (visited.has(key)) continue;

        const connected = getConnectedClaims(key, claim.owner);
        for (const ck of connected) visited.add(ck);
        regions.push({ keys: connected, anchor: key, claim, role: isOwner ? "owner" : "coOwner" });
    }

    return regions;
}

function getSharedRegions(playerId) {
    const claims  = loadClaims();
    const visited = new Set();
    const regions = [];

    for (const [key, claim] of Object.entries(claims)) {
        if (claim.owner === playerId) continue;
        if ((claim.coOwners ?? []).some(co => co.id === playerId)) continue;

        const isShared = (claim.waypointAllowed ?? []).some(p => p.id === playerId);
        const isPublic = claim.waypointPublic ?? false;
        if (!isShared && !isPublic) continue;
        if (visited.has(key)) continue;

        const connected = getConnectedClaims(key, claim.owner);
        for (const ck of connected) visited.add(ck);
        regions.push({ keys: connected, anchor: key, claim, role: isPublic ? "public" : "shared" });
    }

    return regions;
}

// ─── Safe Teleport Helpers ────────────────────────────────────────────────────

const HARMFUL_BLOCK_FRAGMENTS = ["lava", "fire", "water", "cactus", "magma_block", "wither_rose", "pointed_dripstone"];

function isSafeBlock(typeId) {
    return !HARMFUL_BLOCK_FRAGMENTS.some(f => typeId.includes(f));
}

function isSafePosition(dim, x, y, z) {
    try {
        const ground = dim.getBlock({ x, y: y - 1, z });
        const feet   = dim.getBlock({ x, y,       z });
        const head   = dim.getBlock({ x, y: y + 1, z });
        if (!ground || !feet || !head) return false;
        if (!feet.isAir || !head.isAir) return false;
        if (ground.isAir) return false;
        return isSafeBlock(ground.typeId);
    } catch { return false; }
}

function findSafeSpot(dim, x, startY, z) {
    const isNether = dim.id === "minecraft:nether";
    const maxY = isNether ? 122 : 318;
    const minY = isNether ?   2 : -62;
    const fx = Math.floor(x);
    const fz = Math.floor(z);
    const sy = Math.min(Math.max(Math.floor(startY), minY + 1), maxY);

    for (let y = sy; y >= minY + 1; y--) {
        if (isSafePosition(dim, fx, y, fz)) return { x: fx + 0.5, y, z: fz + 0.5 };
    }
    for (let y = sy + 1; y <= maxY; y++) {
        if (isSafePosition(dim, fx, y, fz)) return { x: fx + 0.5, y, z: fz + 0.5 };
    }
    return null;
}

function teleportToRegion(player, anchor) {
    const claim = loadClaims()[anchor];
    if (claim?.waypoint) {
        player.teleport(claim.waypoint);
        return;
    }

    const { cx, cz } = chunkFromKey(anchor);
    const tx = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
    const tz = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
    const dest = findSafeSpot(player.dimension, tx, player.location.y, tz);
    if (dest) {
        player.teleport(dest);
    } else {
        const y = getSurfaceY(player.dimension, tx, tz, player.location.y);
        player.teleport({ x: tx, y, z: tz });
    }
}

async function openWaypointUI(player) {
    const regions  = getMyRegions(player.id);
    const bodyText = regions.length === 0
        ? "§7You have no claimed or co-owned land.\n\n§8Check §7Shared & Public§8 for waypoints others shared with you."
        : "§7Select a region to teleport to:";

    const form = new ActionFormData()
        .title("§6§lMy Lands")
        .body(bodyText);

    for (let i = 0; i < regions.length; i++) {
        const { keys, claim, role } = regions[i];
        const label   = claim.regionName ?? `Region ${i + 1}`;
        const roleTag = role === "coOwner" ? ` §8[${claim.ownerName}]` : "";
        form.button(plainText(`${label}${roleTag} (${keys.length} chunk${keys.length !== 1 ? "s" : ""})`));
    }
    form.button("↗ Shared & Public Waypoints");
    form.button("✕ Close");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection == null) return;

    const sharedIdx = regions.length;
    const closeIdx  = regions.length + 1;
    if (result.selection === closeIdx) return;
    if (result.selection === sharedIdx) { openSharedWaypointsUI(player); return; }

    const { anchor, claim, role } = regions[result.selection];
    try {
        teleportToRegion(player, anchor);
        const label  = claim.regionName ?? `Region ${result.selection + 1}`;
        const suffix = role === "coOwner" ? ` §7(§f${claim.ownerName}§7's land)` : "";
        player.sendMessage(`§a[ChunkClaim] Teleported to §6${label}§a${suffix}§a.`);
    } catch {
        player.sendMessage("§c[ChunkClaim] Teleport failed.");
    }
}

async function openSharedWaypointsUI(player) {
    const regions  = getSharedRegions(player.id);
    const bodyText = regions.length === 0
        ? "§7No one has shared a waypoint with you, and no public waypoints exist."
        : "§7Waypoints shared with you or open to everyone:";

    const form = new ActionFormData()
        .title("§b§lShared & Public Waypoints")
        .body(bodyText);

    for (let i = 0; i < regions.length; i++) {
        const { keys, claim, role } = regions[i];
        const label   = claim.regionName ?? `${claim.ownerName}'s Land`;
        const roleTag = role === "public" ? " §8(Public)" : " §8(Shared with you)";
        form.button(plainText(`${label} [${claim.ownerName}]${roleTag} (${keys.length} chunk${keys.length !== 1 ? "s" : ""})`));
    }
    form.button("◀ My Lands");
    form.button("✕ Close");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection == null) return;
    if (result.selection === regions.length)     { openWaypointUI(player); return; }
    if (result.selection === regions.length + 1) return;

    const { anchor, claim } = regions[result.selection];
    try {
        teleportToRegion(player, anchor);
        const label = claim.regionName ?? `${claim.ownerName}'s Land`;
        player.sendMessage(`§a[ChunkClaim] Teleported to §6${label} §7(§f${claim.ownerName}§7's land)§a.`);
    } catch {
        player.sendMessage("§c[ChunkClaim] Teleport failed.");
    }
}

// ─── Admin: Browse Player Lands ───────────────────────────────────────────────

async function openAdminBrowseLandsUI(player) {
    const claims   = loadClaims();
    const ownerMap = new Map();
    for (const [, claim] of Object.entries(claims)) {
        if (!ownerMap.has(claim.owner)) ownerMap.set(claim.owner, { name: claim.ownerName, count: 0 });
        ownerMap.get(claim.owner).count++;
    }

    if (ownerMap.size === 0) {
        player.sendMessage("§7[Admin] No claims exist.");
        return;
    }

    const owners = [...ownerMap.entries()];
    const form   = new ActionFormData()
        .title("§c§l[Admin] Browse Player Lands")
        .body("§7Select a player to view their regions:");

    for (const [, { name, count }] of owners) {
        form.button(`${name} (${count} chunk${count !== 1 ? "s" : ""})`);
    }
    form.button("✕ Close");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection == null || result.selection >= owners.length) return;

    const [ownerId, { name: ownerName }] = owners[result.selection];
    openAdminPlayerLandsUI(player, ownerId, ownerName);
}

async function openAdminPlayerLandsUI(player, ownerId, ownerName) {
    const regions = getMyRegions(ownerId).filter(r => r.role === "owner");

    if (regions.length === 0) {
        player.sendMessage(`§7[Admin] ${ownerName} has no claims.`);
        return;
    }

    const form = new ActionFormData()
        .title(`§c§l[Admin] ${ownerName}'s Lands`)
        .body(`§7${regions.length} region${regions.length !== 1 ? "s" : ""}. Select to teleport:`);

    for (let i = 0; i < regions.length; i++) {
        const { keys, claim } = regions[i];
        const label = claim.regionName ?? `Region ${i + 1}`;
        form.button(`${label} (${keys.length} chunk${keys.length !== 1 ? "s" : ""})`);
    }
    form.button("◀ Back");
    form.button("✕ Close");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection == null) return;
    if (result.selection === regions.length)     { openAdminBrowseLandsUI(player); return; }
    if (result.selection === regions.length + 1) return;

    const { anchor, claim } = regions[result.selection];
    try {
        teleportToRegion(player, anchor);
        const label = claim.regionName ?? `Region ${result.selection + 1}`;
        player.sendMessage(`§a[Admin] Teleported to §f${ownerName}§a's region §6${label}§a.`);
        broadcastToAdmins(`§c[ChunkClaim Admin] ${player.name} teleported to ${ownerName}'s region "${label ?? anchor}"`);
    } catch {
        player.sendMessage("§c[Admin] Teleport failed.");
    }
}

// ─── Guide UI ────────────────────────────────────────────────────────────────

const GUIDE_TAG = "chunkclaim:saw_guide_v1";

const GUIDE_TOPICS = [
    {
        title: "§6What is ChunkClaim?",
        body:  "§fChunkClaim protects 16×16 block areas called chunks — the full column from bedrock to sky.\n\n§7Only you and trusted players can build, break, or interact in your claimed land.\n\n§fUse the §6Claim Stick §fto manage everything."
    },
    {
        title: "§6The Claim Stick",
        body:  "§fThe §6Claim Stick §fis your main tool.\n\n§7Hold it: §fSee nearby claim borders.\n§7Right-click: §fClaim a chunk or open management.\n§7(OP) Sneak + right-click: §fOpen admin panel.\n\n§8Item ID: chunkclaim:claim_stick"
    },
    {
        title: "§6Claiming Land",
        body:  "§f1. Get §62 Gold Blocks§f.\n2. Stand in the chunk you want.\n3. Right-click with your Claim Stick.\n\n§aIf the chunk is free, it is now yours!\n\n§c§lIMPORTANT: §r§cGold Blocks are NOT refunded if you unclaim."
    },
    {
        title: "§6Gold Block Cost",
        body:  "§fEach chunk costs §62 Gold Blocks §fto claim.\n\nHave them in your inventory before attempting to claim.\n\n§c§lGold is NOT refunded §r§cwhen you unclaim — choose your land carefully!"
    },
    {
        title: "§6Viewing Claims & Borders",
        body:  "§fWhen you enter a chunk, the action bar shows:\n\n§a  Your Claim [x,z] §f— you own it\n§a  You are a Co-Owner §f— you help manage it\n§c  Claimed by Name §f— someone else owns it\n\n§7Borders: §6Flames §7= your claim. §bBlue §7= others."
    },
    {
        title: "§6The Management UI",
        body:  "§fRight-click with your §6Claim Stick §fin §lyour chunk §rto open the §6Management UI§f.\n\nOptions:\n§7• Edit guest permissions\n§7• Manage per-player permissions\n§7• Manage co-owners\n§7• Unclaim your land\n§7• View this guide"
    },
    {
        title: "§6Guest Permissions",
        body:  "§fApply to ALL visitors. All are §cOFF §fby default:\n\n§7Break Blocks §c⚠ §7— can destroy builds\n§7Place Blocks — add blocks\n§7Open Containers §c⚠ §7— access storage\n§7Doors / Gates — pass through\n§7Buttons / Levers — use redstone\n§7Explosions §c⚠ §7— TNT/creeper damage\n\n§cWarned options can cause grief!"
    },
    {
        title: "§6Per-Player Permissions",
        body:  "§fSet custom permissions for a specific player — overrides guest defaults.\n\n§71. Open Management UI\n2. Tap §2Manage Players\n3. Select the online player\n4. Toggle their permissions\n\n§fGreat for trusted friends who need more access than regular guests."
    },
    {
        title: "§6Co-Owners",
        body:  "§fCo-owners help manage your claim:\n\n§a✔ §fEdit guest permissions\n§a✔ §fManage player perms\n§a✔ §fAdd / remove co-owners\n§c✘ §fUnclaim your land\n\n§7Add via Management UI → §2Manage Co-Owners§7.\nChanges apply to all connected chunks."
    },
    {
        title: "§6Unclaiming Land",
        body:  "§f1. Open Management UI\n2. Tap the §cUnclaim §fbutton\n3. Confirm\n\n§c§lGold is NOT refunded!\n\n§fConnected chunks can be unclaimed all at once.\n\n§aGood luck and happy building!\n§7— Silverfox0338 / ChunkClaim v1.9.2"
    }
];

const ADMIN_GUIDE_TOPICS = [
    {
        title: "§c[Admin] The Admin Panel",
        body:  "§fAccess: §lSneak + right-click §rwith Claim Stick (any chunk).\n\n§7Options:\n§e• View Claim Info §7— full details\n§c• Delete Claim §7— removes all connected chunks\n§b• Teleport §7— jump to chunk centre\n§d• Force Add Co-Owner §7— bypass owner\n§6• Toggle Lock §7— freeze owner controls\n§c• Delete All By Player §7— wipe all claims"
    },
    {
        title: "§c[Admin] Claim Tools",
        body:  "§6Claim Lock:\n§fPrevents owner from editing perms or unclaiming. Co-owners and admins are unaffected.\n\n§6Delete All By Player:\n§fWipes every claim by one player. Shows chunk count before confirmation.\n\n§c§lAlways double-check the name before wiping!\n\n§7All admin actions broadcast to all online ops."
    },
    {
        title: "§c[Admin] Data & Performance",
        body:  "§fData stored as JSON in Dynamic Property:\n§8chunkclaim:data\n\n§7Limit: ~32 KB ≈ 100–150 claims.\nWatch console for §c\"Save failed\" §7errors.\n\n§7Admin detection order:\n§f1. permissionLevel >= 2 (operator)\n§f2. Tag §8\"op\"\n\n§7Add the §8op §7tag as fallback if permissionLevel detection fails."
    }
];

async function openGuideUI(player) {
    const adminMode = isAdmin(player);
    const allTopics = adminMode ? [...GUIDE_TOPICS, ...ADMIN_GUIDE_TOPICS] : GUIDE_TOPICS;

    const form = new ActionFormData()
        .title("§6§lChunkClaim Guide")
        .body("§7Select a topic to learn more:");

    for (const t of allTopics) form.button(plainText(t.title));
    form.button(`${t(player, "language")}`);
    form.button(`${t(player, "close")}`);

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection == null) return;
    if (result.selection === allTopics.length) {
        openLanguageUI(player, () => openGuideUI(player));
        return;
    }
    if (result.selection > allTopics.length) return;

    openGuideTopic(player, allTopics[result.selection]);
}

async function openGuideTopic(player, topic) {
    let result;
    try {
        result = await new ActionFormData()
            .title(topic.title)
            .body(topic.body)
            .button("◀ Back to Guide")
            .button("✕ Close")
            .show(player);
    } catch { return; }

    if (!result.canceled && result.selection === 0) openGuideUI(player);
}


// ─── Claim Stick Logic ────────────────────────────────────────────────────────

const _sneakState = new Map();
const _recentUse  = new Map();

async function handleStickUse(player, sneaking = false) {
    const now = Date.now();
    if (now - (_recentUse.get(player.id) ?? 0) < 300) return;
    _recentUse.set(player.id, now);

    if (!player.hasTag(GUIDE_TAG)) {
        player.addTag(GUIDE_TAG);
        openGuideUI(player);
        return;
    }

    const pos    = player.location;
    const key    = chunkKey(Math.floor(pos.x), Math.floor(pos.z));
    const claims = loadClaims();
    const claim  = claims[key];

    if (isAdmin(player) && sneaking) {
        openAdminUI(player, claim ?? null, key);
        return;
    }

    if (claim) {
        if (claim.owner === player.id || isCoOwnerOfClaim(claim, player.id)) {
            openManagementUI(player, claim, key);
        } else {
            const rn = claim.regionName;
            const title = rn ? `§6${rn} §7[${key}]` : `§7Chunk §f${key}`;
            let choice;
            try {
                choice = await new ActionFormData()
                    .title("§cClaimed Land")
                    .body(`${title}\n§7Owner: §f${claim.ownerName}\n\n§7You do not have permission to manage this chunk.`)
                    .button("My Lands")
                    .button("✕ Close")
                    .show(player);
            } catch { return; }
            if (!choice.canceled && choice.selection === 0) openWaypointUI(player);
        }
        return;
    }

    // Unclaimed — show options first
    let choice;
    try {
        choice = await new ActionFormData()
            .title("§6§lUnclaimed Land")
            .body(`§7Chunk §f${key}§7 is unclaimed.\n\nWhat would you like to do?`)
            .button(`Claim This Chunk (${GOLD_COST}x Gold Block)`)
            .button("My Lands")
            .button("Cancel")
            .show(player);
    } catch { return; }

    if (choice.canceled || choice.selection === 2) return;
    if (choice.selection === 1) { openWaypointUI(player); return; }

    // selection === 0: proceed with claiming
    const goldCount = countItems(player, GOLD_BLOCK_ID);
    if (goldCount < GOLD_COST) {
        player.sendMessage(
            `§c[ChunkClaim] Need §f${GOLD_COST}x Gold Block§c to claim. You have §f${goldCount}§c.`
        );
        return;
    }

    removeItems(player, GOLD_BLOCK_ID, GOLD_COST);

    const { cx, cz } = chunkFromKey(key);
    claims[key] = {
        owner: player.id,
        ownerName: player.name,
        cx, cz,
        permissions: defaultPerms(),
        players: {},
        coOwners: [],
        locked: false,
        regionName: null,
        waypoint: null,
        waypointPublic: false,
        waypointAllowed: []
    };
    saveClaims(claims);

    player.sendMessage(`§a[ChunkClaim] Claimed §f${key}§a! Cost: §f${GOLD_COST}x Gold Block§a.`);
}

// ─── Item Events ──────────────────────────────────────────────────────────────

world.beforeEvents.itemUse.subscribe((ev) => {
    if (ev.itemStack?.typeId !== CLAIM_STICK_ID) return;
    ev.cancel = true;
    const sneaking = _sneakState.get(ev.source.id) ?? ev.source.isSneaking;
    system.run(() => handleStickUse(ev.source, sneaking));
});

// `itemUseOn` was removed from WorldBeforeEvents in Script API 2.x. Keep this
// optional for older runtimes; `itemUse` above handles current 2.x clients.
const itemUseOnBefore = world.beforeEvents.itemUseOn;
if (itemUseOnBefore) {
    itemUseOnBefore.subscribe((ev) => {
        if (ev.itemStack?.typeId !== CLAIM_STICK_ID) return;
        ev.cancel = true;
        const sneaking = _sneakState.get(ev.source.id) ?? ev.source.isSneaking;
        system.run(() => handleStickUse(ev.source, sneaking));
    });
}

// ─── Protection: Block Breaking ───────────────────────────────────────────────

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    const claim = getClaimAt(ev.block.location.x, ev.block.location.z);
    if (!claim) return;
    if (claim.owner === ev.player.id) return;
    if (isCoOwnerOfClaim(claim, ev.player.id)) return;
    if (getEffectivePerms(claim, ev.player.id).breakBlocks) return;
    ev.cancel = true;
    system.run(() =>
        ev.player.sendMessage(`§c[ChunkClaim] Breaking blocked in §f${claim.ownerName}§c's claim.`)
    );
});

// ─── Protection: Block Placing ────────────────────────────────────────────────

const playerPlaceBlockBefore = world.beforeEvents.playerPlaceBlock;

if (playerPlaceBlockBefore) {
    playerPlaceBlockBefore.subscribe((ev) => {
        const claim = getClaimAt(ev.block.location.x, ev.block.location.z);
        if (!claim) return;
        if (claim.owner === ev.player.id) return;
        if (isCoOwnerOfClaim(claim, ev.player.id)) return;
        if (getEffectivePerms(claim, ev.player.id).placeBlocks) return;
        ev.cancel = true;
        system.run(() =>
            ev.player.sendMessage(`§c[ChunkClaim] Placing blocked in §f${claim.ownerName}§c's claim.`)
        );
    });
} else {
    console.warn("[ChunkClaim] playerPlaceBlock before-event unavailable; using after-event fallback.");

    world.afterEvents.playerPlaceBlock.subscribe((ev) => {
        const claim = getClaimAt(ev.block.location.x, ev.block.location.z);
        if (!claim) return;
        if (claim.owner === ev.player.id) return;
        if (isCoOwnerOfClaim(claim, ev.player.id)) return;
        if (getEffectivePerms(claim, ev.player.id).placeBlocks) return;

        const refund = ev.block.getItemStack(1);
        try {
            ev.block.setType("minecraft:air");
            refundItem(ev.player, refund);
        } catch (e) {
            console.error("[ChunkClaim] Failed to revert blocked placement:", e);
            return;
        }

        system.run(() =>
            ev.player.sendMessage(`§c[ChunkClaim] Placing blocked in §f${claim.ownerName}§c's claim.`)
        );
    });
}

// ─── Protection: Interactions ─────────────────────────────────────────────────

const playerInteractWithBlockBefore = world.beforeEvents.playerInteractWithBlock;

if (playerInteractWithBlockBefore) {
    playerInteractWithBlockBefore.subscribe((ev) => {
        const claim = getClaimAt(ev.block.location.x, ev.block.location.z);
        if (!claim) return;
        if (claim.owner === ev.player.id) return;
        if (isCoOwnerOfClaim(claim, ev.player.id)) return;

        const id    = ev.block.typeId;
        const perms = getEffectivePerms(claim, ev.player.id);
        let reason  = null;

        if (!perms.openChests  && isContainer(id)) reason = "Container access disabled";
        else if (!perms.useDoors   && isDoor(id))  reason = "Door/gate usage disabled";
        else if (!perms.useButtons && isButton(id)) reason = "Button/lever usage disabled";

        if (!reason) return;
        ev.cancel = true;
        const ownerName = claim.ownerName;
        system.run(() =>
            ev.player.sendMessage(`§c[ChunkClaim] ${reason} in §f${ownerName}§c's claim.`)
        );
    });
} else {
    console.warn("[ChunkClaim] playerInteractWithBlock before-event unavailable; interaction protection disabled.");
}

// ─── Protection: Explosions ───────────────────────────────────────────────────

world.beforeEvents.explosion?.subscribe((ev) => {
    const blocks = ev.getImpactedBlocks();
    const source = ev.source instanceof Player ? ev.source : null;
    let changed  = false;
    const kept   = blocks.filter((block) => {
        const claim = getClaimAt(block.location.x, block.location.z);
        if (!claim) return true;
        if (source && getEffectivePerms(claim, source.id).explosions) return true;
        if (source && claim.owner === source.id) return true;
        if (source && isCoOwnerOfClaim(claim, source.id)) return true;
        changed = true;
        return false;
    });
    if (changed) ev.setImpactedBlocks(kept);
});

// ─── Interval: Sneak State Tracker ───────────────────────────────────────────

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        _sneakState.set(player.id, player.isSneaking);
    }
}, 5);

// ─── Interval: Chunk Entry + Auto Border While Holding Stick ─────────────────

const _lastChunk      = new Map();

// Native slash commands. Bedrock requires custom commands to be namespaced;
// registering both namespaces provides the short /cc:... spelling as well.
function getCommandPlayer(origin) {
    const source = origin.initiator ?? origin.sourceEntity;
    return source instanceof Player ? source : undefined;
}

function helpCommand(origin) {
    const player = getCommandPlayer(origin);
    if (!player) {
        return {
            status: CustomCommandStatus.Failure,
            message: "This command can only be used by a player."
        };
    }

    system.run(() => openGuideUI(player));
    return {
        status: CustomCommandStatus.Success
    };
}

function openSettingsCommand(origin) {
    const player = getCommandPlayer(origin);
    if (!player) {
        return {
            status: CustomCommandStatus.Failure,
            message: "This command can only be used by a player."
        };
    }
    system.run(() => openPlayerSettingsUI(player));
    return { status: CustomCommandStatus.Success };
}

function setNotificationCommand(origin, mode) {
    const player = getCommandPlayer(origin);
    if (!player) {
        return {
            status: CustomCommandStatus.Failure,
            message: "This command can only be used by a player."
        };
    }
    if (!NOTIFICATION_MODES.includes(mode)) {
        return { status: CustomCommandStatus.Failure, message: "Invalid notification mode." };
    }
    system.run(() => {
        setNotificationMode(player, mode);
        player.sendMessage(`§a${t(player, "notificationSaved")}`);
    });
    return { status: CustomCommandStatus.Success };
}

function setStatusHudCommand(origin, mode) {
    const player = getCommandPlayer(origin);
    if (!player) {
        return {
            status: CustomCommandStatus.Failure,
            message: "This command can only be used by a player."
        };
    }
    if (!STATUS_HUD_MODES.includes(mode)) {
        return { status: CustomCommandStatus.Failure, message: "Invalid HUD mode." };
    }
    system.run(() => {
        const enabled = mode === "on";
        setStatusHudEnabled(player, enabled);
        if (!enabled) player.onScreenDisplay.setTitle("CC_HUD:OFF", { fadeInDuration: 0, stayDuration: 0, fadeOutDuration: 0 });
        player.sendMessage(enabled
            ? "§a[ChunkClaim] Personal land HUD enabled."
            : "§7[ChunkClaim] Personal land HUD disabled.");
    });
    return { status: CustomCommandStatus.Success };
}

const startupEvent = system.beforeEvents?.startup ?? world.beforeEvents?.startup;

if (startupEvent) {
    startupEvent.subscribe((init) => {
        const registry = init?.customCommandRegistry;
        if (!registry?.registerCommand) return;

        // Register enums once
        registry.registerEnum("chunkclaim:notification_mode", NOTIFICATION_MODES);
        registry.registerEnum("chunkclaim:status_hud_mode", STATUS_HUD_MODES);

        // Register commands with chunkclaim namespace only
        registry.registerCommand(
            {
                name: "chunkclaim:help",
                description: "Open the ChunkClaim guide",
                permissionLevel: CommandPermissionLevel.Any,
                cheatsRequired: false
            },
            helpCommand
        );

        registry.registerCommand(
            {
                name: "chunkclaim:settings",
                description: "Open your ChunkClaim settings",
                permissionLevel: CommandPermissionLevel.Any,
                cheatsRequired: false
            },
            openSettingsCommand
        );

        registry.registerCommand(
            {
                name: "chunkclaim:notify",
                description: "Set your ChunkClaim land-notification preference",
                permissionLevel: CommandPermissionLevel.Any,
                cheatsRequired: false,
                mandatoryParameters: [
                    { name: "chunkclaim:notification_mode", type: CustomCommandParamType.Enum }
                ]
            },
            setNotificationCommand
        );

        registry.registerCommand(
            {
                name: "chunkclaim:hud",
                description: "Toggle the personal ChunkClaim land-status HUD",
                permissionLevel: CommandPermissionLevel.Any,
                cheatsRequired: false,
                mandatoryParameters: [
                    { name: "chunkclaim:status_hud_mode", type: CustomCommandParamType.Enum }
                ]
            },
            setStatusHudCommand
        );
    });
}

system.run(removeLegacyChunkClaimScoreboard);

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const pos = player.location;
        const key = chunkKey(Math.floor(pos.x), Math.floor(pos.z));

        if (_lastChunk.get(player.id) !== key) {
            _lastChunk.set(player.id, key);
            const claim = loadClaims()[key];
            const notificationMode = getNotificationMode(player);
            if (claim) {
                if (notificationMode !== "off") {
                    const rn = claim.regionName;
                    if (claim.owner === player.id) {
                        player.onScreenDisplay.setActionBar(rn ? `§aYour Land: §6${rn} §7[${key}]` : `§aYour Claim §7[${key}]`);
                    } else if (isCoOwnerOfClaim(claim, player.id)) {
                        player.onScreenDisplay.setActionBar(rn ? `§aCo-Owner of §6${rn} §7[${key}]` : `§aYou are a Co-Owner §7[${key}]`);
                    } else {
                        player.onScreenDisplay.setActionBar(rn ? `§c${claim.ownerName}§f: §6${rn} §7[${key}]` : `§cClaimed by §f${claim.ownerName} §7[${key}]`);
                    }
                }
            } else if (notificationMode === "all") {
                player.onScreenDisplay.setActionBar("§7Unclaimed land");
            }
        }

        if (getStatusHudEnabled(player)) {
            const claim = loadClaims()[key];
            showPersonalHud(player, key, claim);
        }
    }
}, 10);

// ─── Cleanup on Leave ─────────────────────────────────────────────────────────

world.afterEvents.playerLeave.subscribe((ev) => {
    _lastChunk.delete(ev.playerId);
    _playerLanguages.delete(ev.playerId);
    _playerNotifications.delete(ev.playerId);
    _playerStatusHud.delete(ev.playerId);
    _recentUse.delete(ev.playerId);
    _sneakState.delete(ev.playerId);
});

// ─── Block Type Helpers ───────────────────────────────────────────────────────

function isContainer(typeId) {
    return typeId.includes("chest")         ||
           typeId.includes("barrel")        ||
           typeId.includes("shulker_box")   ||
           typeId.includes("hopper")        ||
           typeId.includes("furnace")       ||
           typeId.includes("blast_furnace") ||
           typeId.includes("smoker")        ||
           typeId.includes("dispenser")     ||
           typeId.includes("dropper")       ||
           typeId.includes("brewing_stand") ||
           typeId.includes("enchanting_table");
}

function isDoor(typeId) {
    return typeId.includes("_door") || typeId.includes("_trapdoor") || typeId.includes("_fence_gate");
}

function isButton(typeId) {
    return typeId.includes("_button") || typeId === "minecraft:lever";
}

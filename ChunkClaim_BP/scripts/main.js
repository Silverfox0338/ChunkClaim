import { world, system, Player, ItemStack, EquipmentSlot } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

// ─── Constants ───────────────────────────────────────────────────────────────

const CLAIM_STICK_ID = "chunkclaim:claim_stick";
const GOLD_BLOCK_ID  = "minecraft:gold_block";
const GOLD_COST      = 2;
const CHUNK_SIZE     = 16;
const DATA_KEY       = "chunkclaim:data";
const PREVIEW_RADIUS_CHUNKS = 2;
const BORDER_PREVIEW_INTERVAL_MS = 1000;
const OWN_BORDER_STYLE = {
    edgeParticle: "minecraft:basic_flame_particle",
    cornerParticle: "minecraft:basic_flame_particle"
};
const OTHER_BORDER_STYLE = {
    edgeParticle: "minecraft:soul_fire_flame",
    cornerParticle: "minecraft:soul_fire_flame"
};

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

function getHeldItem(player) {
    const container = getInventoryContainer(player);
    if (container && typeof player.selectedSlotIndex === "number") {
        try {
            return container.getItem(player.selectedSlotIndex);
        } catch {}
    }

    try {
        return player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
    } catch {}

    return undefined;
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

function getSurfaceY(dim, x, z, refY) {
    const top = Math.min(Math.floor(refY) + 8,  319);
    const bot = Math.max(Math.floor(refY) - 64, -64);
    try {
        for (let y = top; y >= bot; y--) {
            const b = dim.getBlock({ x: Math.floor(x), y, z: Math.floor(z) });
            if (b && !b.isAir) return y + 1;
        }
    } catch {}
    return Math.floor(refY) + 1;
}

function borderStyleForClaim(player, claim) {
    return claim?.owner === player.id ? OWN_BORDER_STYLE : OTHER_BORDER_STYLE;
}

function showBorder(player, key, style = OWN_BORDER_STYLE) {
    const { cx, cz } = chunkFromKey(key);
    const x0 = cx * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const refY = player.location.y;
    const dim = player.dimension;
    const claims = loadClaims();
    const ownerId = claims[key]?.owner ?? null;

    const sameOwner = (ncx, ncz) => ownerId && claims[`${ncx},${ncz}`]?.owner === ownerId;

    const drawNorth = !sameOwner(cx,     cz - 1);
    const drawSouth = !sameOwner(cx,     cz + 1);
    const drawWest  = !sameOwner(cx - 1, cz);
    const drawEast  = !sameOwner(cx + 1, cz);

    // Sample Y at each edge midpoint — 4 reads per chunk, accurate on sloped terrain.
    const mid = CHUNK_SIZE / 2;
    const yN = drawNorth ? getSurfaceY(dim, x0 + mid, z0,                  refY) : refY;
    const yS = drawSouth ? getSurfaceY(dim, x0 + mid, z0 + CHUNK_SIZE - 1, refY) : refY;
    const yW = drawWest  ? getSurfaceY(dim, x0,                  z0 + mid, refY) : refY;
    const yE = drawEast  ? getSurfaceY(dim, x0 + CHUNK_SIZE - 1, z0 + mid, refY) : refY;

    const pt = (x, z, y) => {
        try { dim.spawnParticle(style.edgeParticle,   { x: x + 0.5, y, z: z + 0.5 }); } catch {}
    };
    const corner = (x, z, ya, yb) => {
        try { dim.spawnParticle(style.cornerParticle, { x: x + 0.5, y: (ya + yb) / 2, z: z + 0.5 }); } catch {}
    };

    for (let i = 0; i < CHUNK_SIZE; i += 2) {
        if (drawNorth) pt(x0 + i, z0,                  yN);
        if (drawSouth) pt(x0 + i, z0 + CHUNK_SIZE - 1, yS);
        if (drawWest)  pt(x0,                  z0 + i, yW);
        if (drawEast)  pt(x0 + CHUNK_SIZE - 1, z0 + i, yE);
    }

    if (drawNorth || drawWest) corner(x0,                  z0,                  yN, yW);
    if (drawNorth || drawEast) corner(x0 + CHUNK_SIZE - 1, z0,                  yN, yE);
    if (drawSouth || drawWest) corner(x0,                  z0 + CHUNK_SIZE - 1, yS, yW);
    if (drawSouth || drawEast) corner(x0 + CHUNK_SIZE - 1, z0 + CHUNK_SIZE - 1, yS, yE);
}

function showBorders(player, keys, style = OWN_BORDER_STYLE) {
    for (const key of keys) showBorder(player, key, style);
}

function showClaimRegion(player, key) {
    const claim = loadClaims()[key];
    if (!claim) return;
    showBorders(player, getConnectedClaims(key, claim.owner), borderStyleForClaim(player, claim));
}

function showNearbyClaimBorders(player) {
    const pos = player.location;
    const pcx = Math.floor(pos.x / CHUNK_SIZE);
    const pcz = Math.floor(pos.z / CHUNK_SIZE);
    const claims = loadClaims();
    const shown = new Set();
    const currentKey = `${pcx},${pcz}`;

    if (claims[currentKey]) {
        showClaimRegion(player, currentKey);
        return;
    }

    for (let dx = -PREVIEW_RADIUS_CHUNKS; dx <= PREVIEW_RADIUS_CHUNKS; dx++) {
        for (let dz = -PREVIEW_RADIUS_CHUNKS; dz <= PREVIEW_RADIUS_CHUNKS; dz++) {
            const nk = `${pcx + dx},${pcz + dz}`;
            const claim = claims[nk];
            if (!claim || shown.has(nk)) continue;

            const connected = getConnectedClaims(nk, claim.owner);
            for (const ck of connected) shown.add(ck);
            showBorders(player, connected, borderStyleForClaim(player, claim));
        }
    }
}

// ─── Permission & Role Helpers ────────────────────────────────────────────────

function isCoOwnerOfClaim(claim, playerId) {
    return (claim.coOwners ?? []).some(co => co.id === playerId);
}

function getEffectivePerms(claim, playerId) {
    const playerPerms = (claim.players ?? {})[playerId];
    return playerPerms ?? claim.permissions;
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

async function openManagementUI(player, claim, key) {
    const connected = getConnectedClaims(key, claim.owner);
    const count     = connected.length;
    const p         = claim.permissions;
    const isOwner   = claim.owner === player.id;
    const coOwners  = claim.coOwners ?? [];
    const locked    = claim.locked ?? false;

    const on = (b) => b ? "§aON" : "§cOFF";
    const permLines = [
        `§r§f  Break blocks:      ${on(p.breakBlocks)}`,
        `§r§f  Place blocks:      ${on(p.placeBlocks)}`,
        `§r§f  Open containers:   ${on(p.openChests)}`,
        `§r§f  Use doors/gates:   ${on(p.useDoors)}`,
        `§r§f  Buttons/levers:    ${on(p.useButtons)}`,
        `§r§f  Explosions/TNT:    ${on(p.explosions)}`
    ].join("\n");

    const regionName   = claim.regionName ? `§6${claim.regionName}` : null;
    const header       = regionName
        ? `${regionName} §7(${count} chunk${count !== 1 ? "s" : ""})`
        : count > 1 ? `§7Connected region: §f${count} chunks` : `§7Chunk: §f${key}`;
    const coOwnerLine  = coOwners.length > 0 ? `\n§7Co-owners: §f${coOwners.length}` : "";
    const lockLine     = locked ? `\n§c§lThis claim is LOCKED by an admin.` : "";
    const footer       = count > 1 ? `\n§7Edits apply to §fall ${count} connected chunks§7.` : "";

    const form = new ActionFormData()
        .title("§6§lClaim Management")
        .body(`${header}\n§7Owner: §a${claim.ownerName}${coOwnerLine}${lockLine}\n\n§7Guest permissions:\n${permLines}${footer}`);

    const actions = [];

    if (isOwner && locked) {
        form.button("§8Edit Guest Permissions §7[LOCKED]");
        actions.push(() => player.sendMessage("§c[ChunkClaim] This claim is locked. Contact an admin to unlock."));
    } else {
        form.button("§2Edit Guest Permissions");
        actions.push(() => openPermissionsUI(player, claim, key, connected));
    }

    form.button("§2Manage Players");
    actions.push(() => openPlayerListUI(player, claim, key));

    form.button("§2Manage Co-Owners");
    actions.push(() => openCoOwnerUI(player, claim, key));

    if (isOwner && !locked) {
        form.button("§6✎ Name This Region");
        actions.push(() => openNameRegionUI(player, claim, key, connected));
    }

    if (isOwner && !locked) {
        const wpPublic = claim.waypointPublic ?? false;
        const wpShared = (claim.waypointAllowed ?? []).length;
        const wpAccess = wpPublic ? "§aPublic" : wpShared > 0 ? `§e${wpShared} shared` : "§7Private";
        const wpSet    = claim.waypoint ? "§aSet" : "§8None";
        form.button(`§6⚑ Waypoint  §8(${wpSet}§8, ${wpAccess}§8)`);
        actions.push(() => openWaypointSettingsUI(player, claim, key, connected));
    }

    form.button("§bMy Lands");
    actions.push(() => openWaypointUI(player));

    if (isOwner && !locked) {
        form.button(count > 1 ? `§4Unclaim All ${count} Chunks` : "§4Unclaim This Chunk");
        actions.push(() => openUnclaimUI(player, key, connected));
    }

    form.button("§6[?] Help & Guide");
    actions.push(() => openGuideUI(player));

    form.button("§c§l✕ Close");
    actions.push(() => {});

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection == null) return;
    actions[result.selection]?.();
}

// ─── UI: Permission Toggles ───────────────────────────────────────────────────

async function openPermissionsUI(player, claim, key, connectedKeys) {
    const p        = claim.permissions;
    const count    = connectedKeys.length;
    const subtitle = count > 1 ? ` (${count} chunks)` : ` — ${key}`;

    let result;
    try {
        result = await new ModalFormData()
            .title(`§6§lGuest Permissions${subtitle}`)
            .toggle("Allow Breaking Blocks",                 p.breakBlocks)
            .toggle("Allow Placing Blocks",                  p.placeBlocks)
            .toggle("Allow Opening Containers / Chests",     p.openChests)
            .toggle("Allow Using Doors / Gates / Trapdoors", p.useDoors)
            .toggle("Allow Using Buttons / Levers",          p.useButtons)
            .toggle("Allow TNT / Explosions",                p.explosions)
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
    showBorders(player, connectedKeys);
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
                .button("§cJust This Chunk")
                .button(`§4All ${count} Connected Chunks`)
                .button("§c§l✕ Cancel")
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
            .button("§cYes, Unclaim")
            .button("§c§l✕ Cancel")
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
        form.button(`${p.name}${hasCustom ? " §7[Custom]" : ""}`);
    }
    form.button("§c§l✕ Close");

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
            .title(`§6§l${targetPlayer.name}'s Permissions`)
            .toggle("Allow Breaking Blocks",                 existing.breakBlocks)
            .toggle("Allow Placing Blocks",                  existing.placeBlocks)
            .toggle("Allow Opening Containers / Chests",     existing.openChests)
            .toggle("Allow Using Doors / Gates / Trapdoors", existing.useDoors)
            .toggle("Allow Using Buttons / Levers",          existing.useButtons)
            .toggle("Allow TNT / Explosions",                existing.explosions)
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
        .button("§2Add Co-Owner")
        .button("§4Remove Co-Owner")
        .button("§c§l✕ Close");

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
    form.button("§7Back");

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
    form.button("§7Back");

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
        form.button("§eView Claim Info");
        actions.push(() => openAdminViewInfoUI(player, claim, key));

        form.button("§4Delete This Claim");
        actions.push(() => openAdminDeleteClaimUI(player, claim, key));

        form.button("§bTeleport to Claim");
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

        form.button("§dForce Add Co-Owner");
        actions.push(() => openAdminForceCoOwnerUI(player, claim, key));

        const lockLabel = claim.locked ? "§6Toggle Claim Lock §7(§cLOCKED§7)" : "§6Toggle Claim Lock §7(§aUNLOCKED§7)";
        form.button(lockLabel);
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

    form.button("§bBrowse Player Lands");
    actions.push(() => openAdminBrowseLandsUI(player));

    form.button("§4Delete All Claims By Player");
    actions.push(() => openAdminDeleteByPlayerUI(player));

    form.button("§6[?] Help & Guide");
    actions.push(() => openGuideUI(player));

    form.button("§c§l✕ Close");
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
            .button("§c§l✕ Close")
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
            .button("§cYes, Delete")
            .button("§7Cancel")
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
        form.button(`${name} §7(${count} chunk${count !== 1 ? "s" : ""})`);
    }
    form.button("§7Cancel");

    let result;
    try { result = await form.show(player); } catch { return; }

    if (result.canceled || result.selection === owners.length) return;

    const [targetId, { name: targetName, count: targetCount }] = owners[result.selection];

    let confirm;
    try {
        confirm = await new ActionFormData()
            .title("§c§lConfirm Wipe")
            .body(`§cDelete §lALL §r§c${targetCount} claim(s) by §f${targetName}§c?\n§7This cannot be undone.`)
            .button("§cYes, Wipe All")
            .button("§7Cancel")
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
    form.button("§7Cancel");

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
            .textField("Region name (leave blank to clear)", "e.g. My Base", claim.regionName ?? "")
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
            .button("§aSet Waypoint Here")
            .button("§c§l✕ Cancel")
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
            .button("§6⚑ Set Waypoint Here")
            .button(`§6⬡ Waypoint Access  ${wpAccess}`)
            .button("§c§l✕ Close")
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
            .button(isPublic ? "§4Make Private" : "§2Make Public  §7(anyone can TP)")
            .button("§aGrant Access to Player")
            .button(`§cRevoke Player Access ${allowed.length > 0 ? `§7(${allowed.length})` : ""}`)
            .button("§c§l✕ Close")
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
    form.button("§7Back");

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
    form.button("§7Back");

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
        form.button(`§f${label}${roleTag} §7(${keys.length} chunk${keys.length !== 1 ? "s" : ""})`);
    }
    form.button("§b↗ Shared & Public Waypoints");
    form.button("§c§l✕ Close");

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
        form.button(`§f${label} §7[${claim.ownerName}]${roleTag} §7(${keys.length} chunk${keys.length !== 1 ? "s" : ""})`);
    }
    form.button("§7◀ My Lands");
    form.button("§c§l✕ Close");

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
        form.button(`§f${name} §7(${count} chunk${count !== 1 ? "s" : ""})`);
    }
    form.button("§c§l✕ Close");

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
        form.button(`§f${label} §7(${keys.length} chunk${keys.length !== 1 ? "s" : ""})`);
    }
    form.button("§7◀ Back");
    form.button("§c§l✕ Close");

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
        body:  "§f1. Open Management UI\n2. Tap the §cUnclaim §fbutton\n3. Confirm\n\n§c§lGold is NOT refunded!\n\n§fConnected chunks can be unclaimed all at once.\n\n§aGood luck and happy building!\n§7— Silverfox0338 / ChunkClaim v1.9.0"
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

    for (const t of allTopics) form.button(t.title);
    form.button("§c§l✕ Close");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection == null || result.selection >= allTopics.length) return;

    openGuideTopic(player, allTopics[result.selection]);
}

async function openGuideTopic(player, topic) {
    let result;
    try {
        result = await new ActionFormData()
            .title(topic.title)
            .body(topic.body)
            .button("§7◀ Back to Guide")
            .button("§c§l✕ Close")
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
            showClaimRegion(player, key);
            const rn = claim.regionName;
            const title = rn ? `§6${rn} §7[${key}]` : `§7Chunk §f${key}`;
            let choice;
            try {
                choice = await new ActionFormData()
                    .title("§cClaimed Land")
                    .body(`${title}\n§7Owner: §f${claim.ownerName}\n\n§7You do not have permission to manage this chunk.`)
                    .button("§bMy Lands")
                    .button("§c§l✕ Close")
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
            .button(`§2✔ Claim This Chunk  §8(${GOLD_COST}x Gold Block)`)
            .button("§bMy Lands")
            .button("§c§l✕ Cancel")
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
    showClaimRegion(player, key);
}

// ─── Item Events ──────────────────────────────────────────────────────────────

world.beforeEvents.itemUse.subscribe((ev) => {
    if (ev.itemStack?.typeId !== CLAIM_STICK_ID) return;
    ev.cancel = true;
    const sneaking = _sneakState.get(ev.source.id) ?? ev.source.isSneaking;
    system.run(() => handleStickUse(ev.source, sneaking));
});

world.beforeEvents.itemUseOn.subscribe((ev) => {
    if (ev.itemStack?.typeId !== CLAIM_STICK_ID) return;
    ev.cancel = true;
    const sneaking = _sneakState.get(ev.source.id) ?? ev.source.isSneaking;
    system.run(() => handleStickUse(ev.source, sneaking));
});

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
const _lastBorderShow = new Map();

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const pos = player.location;
        const key = chunkKey(Math.floor(pos.x), Math.floor(pos.z));

        if (_lastChunk.get(player.id) !== key) {
            _lastChunk.set(player.id, key);
            const claim = loadClaims()[key];
            if (claim) {
                const rn = claim.regionName;
                if (claim.owner === player.id) {
                    player.onScreenDisplay.setActionBar(rn ? `§aYour Land: §6${rn} §7[${key}]` : `§aYour Claim §7[${key}]`);
                } else if (isCoOwnerOfClaim(claim, player.id)) {
                    player.onScreenDisplay.setActionBar(rn ? `§aCo-Owner of §6${rn} §7[${key}]` : `§aYou are a Co-Owner §7[${key}]`);
                } else {
                    player.onScreenDisplay.setActionBar(rn ? `§c${claim.ownerName}§f: §6${rn} §7[${key}]` : `§cClaimed by §f${claim.ownerName} §7[${key}]`);
                }
                showClaimRegion(player, key);
            } else {
                player.onScreenDisplay.setActionBar("§7Unclaimed land");
            }
        }

        const now = Date.now();
        if (now - (_lastBorderShow.get(player.id) ?? 0) < BORDER_PREVIEW_INTERVAL_MS) continue;

        const held = getHeldItem(player);
        if (held?.typeId !== CLAIM_STICK_ID) continue;

        _lastBorderShow.set(player.id, now);
        showNearbyClaimBorders(player);
    }
}, 10);

// ─── Cleanup on Leave ─────────────────────────────────────────────────────────

world.afterEvents.playerLeave.subscribe((ev) => {
    _lastChunk.delete(ev.playerId);
    _lastBorderShow.delete(ev.playerId);
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

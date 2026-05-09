# ChunkClaim

> A land-claiming add-on for Minecraft Bedrock Edition — protect your 16×16 chunk regions, control who can build, and manage your land from a clean in-game UI.

**Version 1.6.0** · Requires Bedrock 1.21.0+ · Made by [Silverfox0338](https://github.com/Silverfox0338)

---

## What is ChunkClaim?

ChunkClaim divides the Minecraft world into 16×16 block columns called **chunks** and lets players own them. Once you claim a chunk, no one else can break blocks, place blocks, open containers, or interact with anything inside it — unless you specifically allow it.

Claims protect the **entire column** from bedrock to sky. Data is saved automatically and survives server restarts with no database required.

---

## Installation

1. Download **ChunkClaim.mcaddon** from the [Releases](../../releases) page.
2. Double-click the file — Minecraft will import both packs automatically.
3. Open or create a world → **Add-Ons** → enable:
   - ✅ ChunkClaim – Behavior Pack
   - ✅ ChunkClaim – Resource Pack
4. Under **Experiments**, enable **Beta APIs**.
5. Launch the world. You're good to go.

**Bedrock Dedicated Server (BDS):**
- Copy `ChunkClaim_BP/` → `behavior_packs/`
- Copy `ChunkClaim_RP/` → `resource_packs/`
- Register both in `valid_known_packs.json` and the world's pack JSON files.

---

## The Claim Stick

The **Claim Stick** is your only tool. Craft it at a crafting table:

```
[ Gold Block ] [   Air   ] [ Gold Block ]
[    Air    ] [  Stick  ] [    Air     ]
```

- Costs **2 Gold Blocks + 1 Stick**
- Shows as an enchanted stick with a purple glint
- Max stack size of 1

You can also obtain it from the creative menu (`Items` tab) or via `/give @s chunkclaim:claim_stick`.

**While holding the Claim Stick**, borders around nearby claims appear automatically every second so you always know where protected land is.

---

## Claiming Land

1. Hold the Claim Stick.
2. Stand inside the chunk you want to own.
3. **Right-click.**
4. If the chunk is free and you have **2 Gold Blocks** in your inventory, it's claimed — Gold Blocks are consumed.

> ⚠️ Gold Blocks are **not refunded** if you later unclaim.

**First time using the Claim Stick?** The in-game guide will open automatically. You can reopen it any time from the Management UI.

---

## Borders & Action Bar

When you enter a claimed chunk, coloured particle borders appear along the edges:

- 🔥 **Flame** = your own land
- 🔵 **Blue** = another player's land

The **action bar** (above your hotbar) always shows the status of the chunk you're standing in:

| What you see | Meaning |
|---|---|
| `Your Land: [name]` | You own this chunk |
| `You are a Co-Owner` | You help manage this chunk |
| `Claimed by PlayerName` | Someone else owns it |
| `Unclaimed land` | Free to claim |

---

## Management UI

**Right-click** with the Claim Stick while standing in **your own chunk** to open the Management UI.

| Button | What it does |
|---|---|
| Edit Guest Permissions | Toggle what all visitors can do in this region |
| Manage Players | Set custom permissions for a specific online player |
| Manage Co-Owners | Add or remove co-owners |
| ✎ Name This Region | Give your land a custom name |
| My Lands | Teleport between all your regions |
| Unclaim | Remove your claim from this chunk or the whole region |
| [?] Help & Guide | Open the full in-game guide |

---

## Guest Permissions

By default, **all guest actions are blocked**. You can allow them per-region:

| Permission | What it allows | Risk |
|---|---|---|
| Break Blocks | Visitors can destroy blocks | ⚠️ High |
| Place Blocks | Visitors can place blocks | Low |
| Open Containers | Visitors can access chests, barrels, furnaces, etc. | ⚠️ High |
| Doors / Gates | Visitors can use doors, trapdoors, fence gates | Low |
| Buttons / Levers | Visitors can activate redstone inputs | Low |
| Explosions / TNT | Creepers and TNT can damage your land | ⚠️ High |

Permissions are set per **connected region** — all touching chunks you own are updated together.

---

## Per-Player Permissions

Need one specific player to have different access than regular guests?

1. Open the Management UI → **Manage Players**.
2. Select the online player.
3. Toggle their individual permissions.

Per-player permissions **override** the guest defaults for that player only.

---

## Co-Owners

Co-owners are trusted players who help manage your claim. They can:

- ✅ Edit guest permissions
- ✅ Set per-player permissions
- ✅ Add and remove other co-owners

They **cannot** unclaim your land.

Add a co-owner: Management UI → **Manage Co-Owners** → **Add Co-Owner** → select the player.  
Changes apply to all connected chunks instantly.

---

## Naming Your Land

1. Open the Management UI → **✎ Name This Region**.
2. Type a name (up to 32 characters). Leave blank to clear.

The name appears in your **action bar** when anyone enters the chunk, and in your **My Lands** list. Great for keeping track of multiple bases.

---

## My Lands (Waypoints)

See and teleport between all your claimed regions:

1. Open the Management UI in any of your chunks.
2. Tap **My Lands**.
3. Select a region — you'll be teleported to its centre.

Regions are listed with their custom name (or "Region N" if unnamed) and chunk count.

---

## Unclaiming

1. Open the Management UI → **Unclaim**.
2. If your region has multiple chunks, choose:
   - **Just This Chunk** — removes only the chunk you're standing in
   - **All Connected Chunks** — removes the entire region
3. Confirm.

> ⚠️ Gold Blocks are **not refunded**.

---

## What Gets Protected

| Action | Protected by default |
|---|---|
| Breaking blocks | ✅ Yes |
| Placing blocks | ✅ Yes |
| Opening containers | ✅ Yes |
| Using doors / gates | ✅ Yes |
| Using buttons / levers | ✅ Yes |
| Explosion block damage | ✅ Yes |

Owners and co-owners always bypass all restrictions in their own claims.

---

## Quick Reference

| Task | How |
|---|---|
| Craft Claim Stick | 2 Gold Blocks + Stick at crafting table |
| Claim a chunk | Right-click with Claim Stick in free land |
| Open management | Right-click with Claim Stick in your land |
| See whose land it is | Walk into a chunk — action bar updates |
| Teleport to your land | Management UI → My Lands |
| Name your land | Management UI → ✎ Name This Region |
| Add a trusted player | Management UI → Manage Co-Owners |
| Custom access for one player | Management UI → Manage Players |
| Remove a chunk from your claim | Management UI → Unclaim → Just This Chunk |

---

## License

© 2026 Silverfox0338. See [LICENSE](LICENSE) for full terms.

This project is licensed under **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

- ✅ Free to use on any server
- ✅ Free to modify and share with credit
- ❌ Cannot be sold or included in paid content packs
- ❌ Cannot be used on servers that charge money specifically for access to claiming features

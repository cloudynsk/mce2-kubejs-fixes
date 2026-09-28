# mce2-kubejs-fixes

Small KubeJS compatibility fixes developed for **Minecraft Eternal 2 (MCE2)**.

## MineColonies summon neutrality

File:

`server_scripts/minecolonies_summon_neutrality.js`

This patch fixes several interactions between:

- MineColonies
- Iron's Spells 'n Spellbooks
- Cataclysm Spellbooks
- FTB Teams
- KubeJS

### What it fixes

The script handles three separate hostility paths:

1. **Summons attacking MineColonies citizens**
   - Adds supported summon entity types to `minecolonies:mob_attack_blacklist`.
   - This prevents MineColonies from injecting citizen-targeting AI into those summons.

2. **MineColonies guards attacking summons**
   - Adds the summon entity types to each guard building's persistent `hostiles` ignore list.
   - Existing guard buildings are patched when the script loads.
   - Newly created guard buildings are checked periodically.

3. **Summons attacking the summoner's teammates**
   - Intercepts Forge target changes for Iron's `IMagicSummon` entities.
   - Protects the summoner, vanilla-team allies, and players in the same FTB Team.
   - Also cancels incoming summon damage to protected teammates as a safety net for attacks or beams that were already committed before the target was cleared.

### Why the Prowler is especially aggressive

Cataclysm Spellbooks' `SummonedProwler` inherits Cataclysm's normal Prowler AI.

The base Prowler adds a player target goal:

```java
new NearestAttackableTargetGoal<>(this, Player.class, true)
```

The summoned Prowler attempts to remove hostile target goals, but the inherited target goal can still remain active after `super.registerGoals()`. The result is a summon that can actively acquire nearby players as targets instead of merely retaliating.

This patch rejects allied player targets before the summon accepts them and also blocks allied-player damage as a fallback.

### Supported summon IDs

Cataclysm Spellbooks:

- `cataclysm_spellbooks:summoned_ignited_revenant`
- `cataclysm_spellbooks:summoned_ignited_berserker`
- `cataclysm_spellbooks:summoned_koboldiator`
- `cataclysm_spellbooks:summoned_koboleton`
- `cataclysm_spellbooks:summoned_draugur`
- `cataclysm_spellbooks:summoned_royal_draugur`
- `cataclysm_spellbooks:summoned_elite_draugur`
- `cataclysm_spellbooks:summoned_aptrgangr`
- `cataclysm_spellbooks:summoned_watcher`
- `cataclysm_spellbooks:summoned_prowler`
- `cataclysm_spellbooks:summoned_counterspell_watcher`
- `cataclysm_spellbooks:summoned_amethyst_crab`
- `cataclysm_spellbooks:summoned_coral_golem`
- `cataclysm_spellbooks:summoned_coralssus`
- `cataclysm_spellbooks:summoned_clawdian`

Iron's Spells:

- `irons_spellbooks:summoned_vex`
- `irons_spellbooks:summoned_zombie`
- `irons_spellbooks:summoned_skeleton`
- `irons_spellbooks:summoned_polar_bear`

## Installation

Copy:

```text
server_scripts/minecolonies_summon_neutrality.js
```

to the server's:

```text
kubejs/server_scripts/
```

Then restart the server.

A full restart is recommended after first installation so entity tags, Forge event handlers, and MineColonies state all start cleanly.

For an already-running server, `/reload` may load the script, but use freshly summoned entities when testing because an existing mob may already have a target or attack animation in progress.

## Known working environment

This patch was developed against an MCE2 Minecraft 1.20.1 server using:

- Forge 47.4.2
- Iron's Spells 'n Spellbooks 3.15.6
- Cataclysm Spellbooks 1.2.8
- MineColonies
- FTB Teams
- KubeJS

It uses Java classes from those mods directly and is intended for this modpack/environment. Other versions may rename classes, methods, or entity IDs.

## Team behavior

The player-friendly logic considers these relationships friendly:

- the summon owner
- vanilla Minecraft scoreboard-team allies
- players in the same FTB Team

MCE2 configures Open Parties and Claims to use `ftb_teams` as its primary party system, so players using that same FTB Team are covered.

Players who are not allied by those rules are not made universally immune to summons.

## Background

The MineColonies side of this problem is related to:

- Iron's Spells issue #664: https://github.com/iron431/Irons-Spells-n-Spellbooks/issues/664

The Iron's Spells maintainer specifically pointed to MineColonies' `mobAttackBlacklist` for the citizen-targeting side. The guard-targeting and allied-player cases require additional handling, which is what this script provides.

## Integrity

The initial published script was copied from the verified live server version.

Initial source SHA-256:

```text
9e30067355bc455d148e5d1bf1143a0603493db4328b48c8aa170056d653e354
```

## License

MIT.

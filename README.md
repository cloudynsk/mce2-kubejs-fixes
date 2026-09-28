# mce2-kubejs-fixes

Small KubeJS compatibility fixes for Minecraft Eternal 2 (Minecraft 1.20.1).

## MineColonies + summon neutrality

Install both files into the matching folders:

```text
kubejs/server_scripts/minecolonies_summon_neutrality.js
kubejs/startup_scripts/summon_player_alliance.js
```

Then fully restart the server. The startup script registers a Forge target-change listener, so `/reload` alone is not enough.

### What the files do

- `server_scripts/minecolonies_summon_neutrality.js`
  - adds supported summons to `minecolonies:mob_attack_blacklist`
  - makes MineColonies guard buildings ignore those summon entity types

- `startup_scripts/summon_player_alliance.js`
  - prevents Iron's `IMagicSummon` entities from accepting MineColonies citizens or guards as targets
  - prevents summons from accepting the summoner or players in the same FTB Team as targets
  - covers Counterspell Watchers, whose own AI explicitly targets all `Mob` entities, including MineColonies citizens
  - uses FTB Teams' `getTeamForPlayer(ServerPlayer)` API instead of raw Minecraft UUID methods, which are not safely exposed to Rhino in this MCE2 runtime

### Cataclysm summon AI root causes

Cataclysm's normal Prowler registers a `NearestAttackableTargetGoal<Player>`. The summoned Prowler calls the parent goal registration, so the player-targeting goal can still be present.

The normal Watcher has the same inherited-target-goal pattern. `SummonedCounterspellWatcher` additionally registers `NearestAttackableTargetGoal<Mob>`, which can directly select MineColonies citizens because they are mob entities. The startup hook blocks MineColonies citizen targets regardless of which AI goal proposed them.

### Known environment

- Minecraft 1.20.1
- Forge 47.4.2
- KubeJS 6 / Rhino 2001.2.3-build.6
- FTB Teams 2001.3.2
- Iron's Spells 'n Spellbooks 3.15.6
- Cataclysm Spellbooks 1.2.8
- L_Ender's Cataclysm 3.16
- MineColonies

This is an unofficial compatibility patch. Other versions may require changes.

## License

MIT.

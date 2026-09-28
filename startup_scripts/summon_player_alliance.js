// Prevent Iron's Spells / Cataclysm Spellbooks summons from targeting allied players.
// Forge listeners must live in kubejs/startup_scripts and require a full server restart.

const MCE2_IMagicSummon = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon')
const MCE2_ServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')
const MCE2_MineColoniesCitizen = Java.loadClass('com.minecolonies.api.entity.citizen.AbstractEntityCitizen')
const MCE2_FTBTeamsAPI = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI')

function mce2AreAlliedPlayers(owner, other) {
  if (!(owner instanceof MCE2_ServerPlayer) || !(other instanceof MCE2_ServerPlayer)) return false
  if (owner === other) return true

  const api = MCE2_FTBTeamsAPI.api()
  if (api == null || !api.isManagerLoaded()) return false

  const manager = api.getManager()
  const ownerTeam = manager.getTeamForPlayer(owner)
  const otherTeam = manager.getTeamForPlayer(other)

  if (!ownerTeam.isPresent() || !otherTeam.isPresent()) return false
  return ownerTeam.get().getId().equals(otherTeam.get().getId())
}

// Cataclysm summons can inherit hostile Player-target goals from their base mobs.
// Never allow a compatibility-hook failure to escape into the entity tick.
let mce2AllianceHookErrorLogged = false
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingChangeTargetEvent', event => {
  try {
    const summon = event.getEntity()
    const target = event.getNewTarget()

    if (!(summon instanceof MCE2_IMagicSummon)) return

    // MineColonies citizens and guards must stay neutral to player summons,
    // including Counterspell Watchers that explicitly target all Mob entities.
    if (target instanceof MCE2_MineColoniesCitizen) {
      event.setCanceled(true)
      return
    }

    if (!(target instanceof MCE2_ServerPlayer)) return

    const owner = summon.getSummoner()
    if (mce2AreAlliedPlayers(owner, target)) {
      event.setCanceled(true)
    }
  } catch (error) {
    if (!mce2AllianceHookErrorLogged) {
      mce2AllianceHookErrorLogged = true
      console.error('[MCE2] Summon player-alliance target hook failed safely: ' + error)
    }
  }
})

console.info('[MCE2] Summon player-alliance Forge protection registered.')

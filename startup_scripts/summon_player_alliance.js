// Prevent Iron's Spells / Cataclysm Spellbooks summons from targeting allied players.
// Forge listeners must live in kubejs/startup_scripts and require a full server restart.

const MCE2_IMagicSummon = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon')
const MCE2_ServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')
const MCE2_FTBTeamsAPI = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI')

function mce2AreAlliedPlayers(owner, other) {
  if (!(owner instanceof MCE2_ServerPlayer) || !(other instanceof MCE2_ServerPlayer)) return false
  if (owner.getUUID().equals(other.getUUID())) return true
  if (owner.isAlliedTo(other) || other.isAlliedTo(owner)) return true

  try {
    const api = MCE2_FTBTeamsAPI.api()
    if (api != null && api.isManagerLoaded()) {
      return api.getManager().arePlayersInSameTeam(owner.getUUID(), other.getUUID())
    }
  } catch (ignored) {
    // Keep vanilla alliance behavior if FTB Teams is temporarily unavailable.
  }

  return false
}

function mce2GetMagicSummonFromDamage(source) {
  const direct = source.getDirectEntity()
  if (direct instanceof MCE2_IMagicSummon) return direct

  const causing = source.getEntity()
  if (causing instanceof MCE2_IMagicSummon) return causing

  return null
}

// Cataclysm summons can inherit hostile Player-target goals from their base mobs.
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingChangeTargetEvent', event => {
  const summon = event.getEntity()
  const target = event.getNewTarget()

  if (!(summon instanceof MCE2_IMagicSummon)) return
  if (!(target instanceof MCE2_ServerPlayer)) return

  const owner = summon.getSummoner()
  if (mce2AreAlliedPlayers(owner, target)) {
    event.setNewTarget(null)
  }
})

// Safety net for an attack/beam already committed before its allied target was cleared.
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingAttackEvent', event => {
  const victim = event.getEntity()
  if (!(victim instanceof MCE2_ServerPlayer)) return

  const summon = mce2GetMagicSummonFromDamage(event.getSource())
  if (summon == null) return

  const owner = summon.getSummoner()
  if (mce2AreAlliedPlayers(owner, victim)) {
    event.setCanceled(true)
  }
})

console.info('[MCE2] Summon player-alliance Forge protection registered.')

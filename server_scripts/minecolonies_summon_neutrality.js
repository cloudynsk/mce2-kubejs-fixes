// Keep MineColonies citizens, guards, and players neutral to player-owned magic summons.
// MCE2 compatibility patch for Cataclysm Spellbooks + Iron's Spells.

const $IColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager')
const $EntityListModule = Java.loadClass('com.minecolonies.core.colony.buildings.modules.EntityListModule')
const $ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const $IMagicSummon = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon')
const $ServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')
const $MineColoniesCitizen = Java.loadClass('com.minecolonies.api.entity.citizen.AbstractEntityCitizen')
const $DeathLaserBeam = Java.loadClass('com.github.L_Ender.cataclysm.entity.projectile.Death_Laser_Beam_Entity')
const $NearestAttackableTargetGoal = Java.loadClass('net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal')

const MCE2_FRIENDLY_SUMMONS = [
  'cataclysm_spellbooks:summoned_ignited_revenant',
  'cataclysm_spellbooks:summoned_ignited_berserker',
  'cataclysm_spellbooks:summoned_koboldiator',
  'cataclysm_spellbooks:summoned_koboleton',
  'cataclysm_spellbooks:summoned_draugur',
  'cataclysm_spellbooks:summoned_royal_draugur',
  'cataclysm_spellbooks:summoned_elite_draugur',
  'cataclysm_spellbooks:summoned_aptrgangr',
  'cataclysm_spellbooks:summoned_watcher',
  'cataclysm_spellbooks:summoned_prowler',
  'cataclysm_spellbooks:summoned_counterspell_watcher',
  'cataclysm_spellbooks:summoned_amethyst_crab',
  'cataclysm_spellbooks:summoned_coral_golem',
  'cataclysm_spellbooks:summoned_coralssus',
  'cataclysm_spellbooks:summoned_clawdian',
  'irons_spellbooks:summoned_vex',
  'irons_spellbooks:summoned_zombie',
  'irons_spellbooks:summoned_skeleton',
  'irons_spellbooks:summoned_polar_bear'
]

ServerEvents.tags('entity_type', event => {
  MCE2_FRIENDLY_SUMMONS.forEach(entityType => {
    event.add('minecolonies:mob_attack_blacklist', entityType)
  })
})


// Cataclysm Spellbooks summon classes call super.registerGoals() after adding
// their summon goals, which re-adds the base mob's priority-2 player scanner.
// Remove that scanner directly when the summon enters the world.
//
// Forge 1.20.1 exposes Mob.targetSelector publicly, and GoalSelector /
// WrappedGoal expose the Mojmap methods below. Use those public names here;
// the SRG field name is not exposed as a Rhino property in this KubeJS runtime.
let mce2GoalSanitizerErrorLogged = false
EntityEvents.spawned(event => {
  try {
    var entity = event.entity
    if (!(entity instanceof $IMagicSummon)) return

    var selector = entity.targetSelector
    var wrappedGoals = selector.getAvailableGoals().toArray()
    var removed = 0

    for (var i = 0; i < wrappedGoals.length; i++) {
      var wrapped = wrappedGoals[i]
      if (wrapped.getPriority() !== 2) continue

      var goal = wrapped.getGoal()
      if (!(goal instanceof $NearestAttackableTargetGoal)) continue

      selector.removeGoal(goal)
      removed++
    }

    if (removed > 0) {
      console.info('[MCE2] Removed ' + removed + ' inherited player-target goal(s) from ' + entity.type)
    }
  } catch (error) {
    if (!mce2GoalSanitizerErrorLogged) {
      mce2GoalSanitizerErrorLogged = true
      console.error('[MCE2] Summon target-goal sanitizer failed safely: ' + error)
    }
  }
})

function mce2GetDamageSummon(source) {
  const actual = source.getActual()
  if (actual instanceof $IMagicSummon) return actual

  const immediate = source.getImmediate()
  if (immediate instanceof $IMagicSummon) return immediate

  // Cataclysm's Prowler death laser is a separate beam entity whose public
  // caster field points back to the Prowler that created it.
  if (immediate instanceof $DeathLaserBeam) {
    const caster = immediate.caster
    if (caster instanceof $IMagicSummon) return caster
  }

  return null
}

// Protect every player and MineColonies citizen from direct/projectile/AoE
// damage caused by player-owned magic summons.
let mce2SummonDamageHookErrorLogged = false
EntityEvents.hurt(event => {
  var shouldCancel = false

  try {
    var victim = event.entity

    if (!(victim instanceof $MineColoniesCitizen) && !(victim instanceof $ServerPlayer)) return

    var summon = mce2GetDamageSummon(event.source)
    if (summon == null) return

    shouldCancel = true
  } catch (error) {
    if (!mce2SummonDamageHookErrorLogged) {
      mce2SummonDamageHookErrorLogged = true
      console.error('[MCE2] Summon damage-neutrality hook failed safely: ' + error)
    }
    return
  }

  if (shouldCancel) event.cancel()
})

function patchMineColoniesGuardTargets() {
  let changedBuildings = 0

  $IColonyManager.getInstance().getAllColonies().forEach(colony => {
    colony.getServerBuildingManager().getBuildings().values().forEach(building => {
      building.getModules($EntityListModule).forEach(module => {
        if (String(module.getId()) !== 'hostiles') return

        let changed = false
        MCE2_FRIENDLY_SUMMONS.forEach(entityType => {
          const id = new $ResourceLocation(entityType)
          if (!module.isEntityInList(id)) {
            module.addEntity(id)
            changed = true
          }
        })

        if (changed) changedBuildings++
      })
    })
  })

  if (changedBuildings > 0) {
    console.info('[MCE2] MineColonies summon neutrality applied to ' + changedBuildings + ' guard building(s).')
  }
}

let mce2SummonNeutralityInitialPass = false
ServerEvents.tick(event => {
  if (!mce2SummonNeutralityInitialPass) {
    mce2SummonNeutralityInitialPass = true
    patchMineColoniesGuardTargets()
    return
  }

  if (event.server.tickCount % 1200 !== 0) return
  patchMineColoniesGuardTargets()
})

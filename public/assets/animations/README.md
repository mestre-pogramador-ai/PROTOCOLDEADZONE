Animation data is embedded in the local GLB files. tactical-arms.glb contains
the authored SupportReload clip, baked from the CC0 source rig using Blender IK.
infected.glb contains Quaternius' Idle, Walk, Run, Bite and Crawl (used only as
a folded visual death pose, never as crawling AI). HitReaction is a procedural
AnimationClip; Collapse_from_Crawl adapts the source's Crawl clip in
InfectedView.tsx. Weapon pose curves are in VisualMotion.ts/M9Viewmodel.tsx.
No animation is allowed to modify ammo, HP, hitboxes, AI state or the GameClock.

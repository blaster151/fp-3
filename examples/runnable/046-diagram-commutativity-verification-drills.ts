// Compatibility shim for external runners that still import the stage 045 drills
// under the 046-diagram slug. Re-export the canonical implementation so existing
// tooling continues to function while callers migrate to the updated manifest.
export { stage045DiagramCommutativityVerificationDrills as stage046DiagramCommutativityVerificationDrills } from "./045-diagram-commutativity-verification-drills";

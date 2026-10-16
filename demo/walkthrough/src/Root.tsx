import { Composition, Folder } from "remotion";
import { FamilyGuard } from "./Composition";
import { FamilyScene } from "./FamilyScene";
import { UsageScene } from "./UsageScene";
import { PolicyScene } from "./PolicyScene";
import { ChildScene } from "./ChildScene";
import { ReadinessScene } from "./ReadinessScene";
export const RemotionRoot = () => (
  <>
    <Composition
      id="FamilyGuard"
      component={FamilyGuard}
      durationInFrames={1200}
      fps={30}
      width={1280}
      height={720}
    />
    <Folder name="Scenes">
      <Composition
        id="Overview"
        component={FamilyScene}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="Usage"
        component={UsageScene}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="Policies"
        component={PolicyScene}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="Child"
        component={ChildScene}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="Readiness"
        component={ReadinessScene}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
      />
    </Folder>
  </>
);

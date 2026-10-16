import { Series, useVideoConfig } from "remotion";
import { FamilyScene } from "./FamilyScene";
import { UsageScene } from "./UsageScene";
import { PolicyScene } from "./PolicyScene";
import { ChildScene } from "./ChildScene";
import { ReadinessScene } from "./ReadinessScene";
export const FamilyGuard = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence
        name="Family overview"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <FamilyScene />
      </Series.Sequence>
      <Series.Sequence
        name="Usage analytics"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <UsageScene />
      </Series.Sequence>
      <Series.Sequence
        name="Policies and capabilities"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <PolicyScene />
      </Series.Sequence>
      <Series.Sequence
        name="Child consent and check-ins"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <ChildScene />
      </Series.Sequence>
      <Series.Sequence
        name="Verification and remaining gates"
        durationInFrames={8 * fps}
        premountFor={fps}
      >
        <ReadinessScene />
      </Series.Sequence>
    </Series>
  );
};

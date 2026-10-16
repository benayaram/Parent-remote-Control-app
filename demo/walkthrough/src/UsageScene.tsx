import { useCurrentFrame, interpolate } from "remotion";
import { Card, Frame, Tag, Label, colors } from "./Dashboard";
export const UsageScene = () => {
  const f = useCurrentFrame();
  return (
    <Frame
      section="Screen time"
      title="Understand the day."
      subtitle="Daily aggregates show time, timezone, sync age and sampling limits."
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 20 }}
      >
        <Card>
          <Label>THIS WEEK · SYNTHETIC USAGE</Label>
          <div
            style={{
              height: 206,
              display: "flex",
              alignItems: "flex-end",
              gap: 22,
              borderBottom: "1px solid #dce6dd",
              padding: "0 10px 0",
            }}
          >
            {[65, 100, 82, 120, 84, 45, 56].map((v, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    height: interpolate(f, [0, 65], [0, v * 1.35], {
                      extrapolateRight: "clamp",
                    }),
                    background: i === 4 ? colors.green : "#c0d9c4",
                    borderRadius: "7px 7px 0 0",
                  }}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              fontSize: 14,
              color: colors.muted,
              marginTop: 13,
            }}
          >
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Tag>Timezone-aware day boundaries</Tag>
          </div>
        </Card>
        <Card>
          <Label>TOP APPS · SAMPLE</Label>
          {[
            ["Learning", "32 min"],
            ["Games", "28 min"],
            ["Reading", "24 min"],
          ].map(([n, v]) => (
            <div
              key={n}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "19px 0",
                borderBottom: "1px solid #edf0eb",
                fontSize: 20,
              }}
            >
              <span>{n}</span>
              <b>{v}</b>
            </div>
          ))}
          <p style={{ fontSize: 16, lineHeight: 1.5, color: colors.muted }}>
            Android may hide packages. UsageEvents are sampled and can have
            gaps.
          </p>
          <Tag warn>Partial app inventory</Tag>
        </Card>
      </div>
    </Frame>
  );
};

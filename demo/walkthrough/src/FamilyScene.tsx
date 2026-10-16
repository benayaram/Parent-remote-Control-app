import { useCurrentFrame, interpolate } from "remotion";
import { Card, Frame, Tag, Label, colors } from "./Dashboard";
export const FamilyScene = () => {
  const frame = useCurrentFrame();
  return (
    <Frame
      section="Overview"
      title="A little more balance."
      subtitle="One family view. Clear permissions. No hidden monitoring."
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}
      >
        <Card>
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              marginBottom: 26,
            }}
          >
            <div
              style={{
                background: colors.mint,
                borderRadius: "50%",
                padding: 16,
                fontSize: 26,
              }}
            >
              S
            </div>
            <div>
              <b style={{ fontSize: 25 }}>Sam’s Android</b>
              <div style={{ color: colors.muted, marginTop: 7, fontSize: 15 }}>
                Standard family mode · sample device
              </div>
            </div>
          </div>
          <Label>SCREEN TIME TODAY · SAMPLE</Label>
          <div style={{ fontSize: 51, fontWeight: 800 }}>
            1h 24m{" "}
            <span
              style={{ fontSize: 17, fontWeight: 400, color: colors.muted }}
            >
              of 2h budget
            </span>
          </div>
          <div
            style={{
              height: 10,
              background: colors.mint,
              borderRadius: 8,
              margin: "19px 0 14px",
            }}
          >
            <div
              style={{
                height: 10,
                borderRadius: 8,
                width: `${interpolate(frame, [0, 70], [0, 70], { extrapolateRight: "clamp" })}%`,
                background: colors.green,
              }}
            />
          </div>
          <div style={{ color: colors.muted, fontSize: 15 }}>
            36 minutes remaining · reminder-based limits
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Tag>Usage access shown</Tag>
            <Tag warn>Sample report</Tag>
          </div>
        </Card>
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <Label>VISIBILITY FIRST</Label>
            <b style={{ fontSize: 23 }}>Supervision is disclosed</b>
            <p
              style={{
                color: colors.muted,
                fontSize: 16,
                lineHeight: 1.5,
                marginBottom: 0,
              }}
            >
              Children can see their rules, permission state and shared
              information.
            </p>
          </Card>
          <Card>
            <Label>REMOTE ACTIONS</Label>
            <b style={{ fontSize: 23 }}>Capability-aware</b>
            <p style={{ color: colors.muted, fontSize: 16, lineHeight: 1.5 }}>
              A command stays pending until the device reports its result.
            </p>
            <Tag warn>No device connected in demo</Tag>
          </Card>
        </div>
      </div>
    </Frame>
  );
};

import { Card, Frame, Tag, Label, colors } from "./Dashboard";
export const PolicyScene = () => (
  <Frame
    section="Rules & safety"
    title="Rules with honest outcomes."
    subtitle="Standard phones get reminders. Strong controls need eligible enrollment."
  >
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card>
        <Label>DAILY BUDGET</Label>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <b style={{ fontSize: 36 }}>120 minutes</b>
          <Tag>Versioned policy</Tag>
        </div>
        <div
          style={{
            height: 8,
            background: "#c0d9c4",
            borderRadius: 8,
            marginBottom: 26,
          }}
        />
        <div
          style={{
            background: colors.mint,
            padding: 17,
            borderRadius: 12,
            fontSize: 17,
            lineHeight: 1.5,
          }}
        >
          Policies cache on the child device. Background sync is best effort.
        </div>
        <div style={{ marginTop: 24, fontSize: 19 }}>
          Extra time request <b>+15 min</b>
        </div>
        <p style={{ fontSize: 15, color: colors.muted }}>
          Parent approvals expire; changes require sync.
        </p>
      </Card>
      <Card>
        <Label>DEVICE CAPABILITIES</Label>
        {[
          ["Remote screen lock", "Active admin required"],
          ["Strict app suspension", "Managed owner only"],
          ["Study kiosk", "Not yet operational"],
          ["DNS-only filtering", "User approval · device test pending"],
        ].map(([a, b]) => (
          <div
            key={a}
            style={{ padding: "13px 0", borderBottom: "1px solid #edf0eb" }}
          >
            <div style={{ fontSize: 19, fontWeight: 700 }}>{a}</div>
            <div style={{ fontSize: 15, color: colors.amber, marginTop: 6 }}>
              {b}
            </div>
          </div>
        ))}
        <p style={{ fontSize: 15, color: colors.muted }}>
          Emergency and accessibility functions must stay available.
        </p>
      </Card>
    </div>
  </Frame>
);

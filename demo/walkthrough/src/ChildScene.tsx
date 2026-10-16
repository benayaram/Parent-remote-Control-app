import { Card, Frame, Tag, Label, colors } from "./Dashboard";
export const ChildScene = () => (
  <Frame
    section="Child experience"
    title="The child stays in control."
    subtitle="Consent and visibility are part of the feature, every time."
  >
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card>
        <Label>LOCAL CAMERA / VOICE CHECK-IN</Label>
        <div
          style={{
            height: 145,
            borderRadius: 15,
            background: "#183e35",
            color: "#d5e6da",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 23,
            marginBottom: 20,
          }}
        >
          Camera and microphone are OFF
        </div>
        <div style={{ fontSize: 19, lineHeight: 1.7 }}>
          Child taps to open capture.
          <br />
          Android asks for permission.
          <br />
          Voice stops after 60 seconds or on exit.
        </div>
        <div style={{ marginTop: 17 }}>
          <Tag warn>Native flow not hardware tested</Tag>
        </div>
      </Card>
      <Card>
        <Label>SAFETY & PRIVACY</Label>
        <b style={{ fontSize: 26 }}>Nothing starts remotely.</b>
        <p style={{ fontSize: 19, lineHeight: 1.6, color: colors.muted }}>
          Voice stays local. A photo uploads to Firebase Storage only after the
          child chooses Share. Parents can view only explicitly shared photos.
          No remote activation exists.
        </p>
        <div
          style={{
            background: "#fff1ed",
            padding: 17,
            borderRadius: 12,
            color: "#a83e2f",
            fontWeight: 700,
            fontSize: 19,
          }}
        >
          SOS + system dialer
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: colors.muted }}>
          SOS delivery can fail. The system dialer remains available without the
          backend.
        </p>
      </Card>
    </div>
  </Frame>
);

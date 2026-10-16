import { Card, Frame, Label, Tag, colors } from "./Dashboard";
export const ReadinessScene = () => (
  <Frame
    section="Readiness"
    title="Built in phases. Verified clearly."
    subtitle="This walkthrough illustrates the interface; it is not an Android device test."
  >
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card>
        <Label>AUTOMATED EVIDENCE</Label>
        <b style={{ fontSize: 29 }}>Backend security tests pass</b>
        <p style={{ fontSize: 19, lineHeight: 1.8, color: colors.muted }}>
          Family isolation
          <br />
          Pairing expiry and one-time use
          <br />
          Signed request replay protection
          <br />
          Command expiry and revocation
          <br />
          Retention and family deletion
        </p>
        <Tag>See repository for current counts</Tag>
      </Card>
      <Card>
        <Label>REMAINING RELEASE GATES</Label>
        <p style={{ fontSize: 21, lineHeight: 1.85, marginTop: 0 }}>
          Flutter app builds
          <br />
          Firebase, Storage + Mongo integration
          <br />
          Physical Android permission tests
          <br />
          Managed-device recovery tests
          <br />
          Play policy and privacy review
        </p>
        <div
          style={{
            background: "#fff1d9",
            color: colors.amber,
            padding: 17,
            borderRadius: 12,
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          Development source — not production ready
        </div>
      </Card>
    </div>
  </Frame>
);

import React from "react";
export const colors = {
  ink: "#17332f",
  green: "#176c59",
  mint: "#e7f3eb",
  bg: "#f4f7f3",
  muted: "#70827b",
  amber: "#aa6417",
};
export const Card = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      background: "white",
      border: "1px solid #dce6dd",
      borderRadius: 20,
      padding: 24,
      ...style,
    }}
  >
    {children}
  </div>
);
export const Tag = ({
  children,
  warn = false,
}: {
  children: React.ReactNode;
  warn?: boolean;
}) => (
  <span
    style={{
      display: "inline-block",
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: 0.3,
      padding: "7px 12px",
      borderRadius: 24,
      background: warn ? "#fff1d9" : colors.mint,
      color: warn ? colors.amber : colors.green,
    }}
  >
    {children}
  </span>
);
export const Label = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: 14,
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      fontWeight: 700,
      marginBottom: 10,
    }}
  >
    {children}
  </div>
);
export const Frame = ({
  section,
  title,
  subtitle,
  children,
}: {
  section: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      width: 1280,
      height: 720,
      background: colors.bg,
      color: colors.ink,
      fontFamily: "Arial, sans-serif",
      display: "flex",
    }}
  >
    <aside
      style={{
        width: 205,
        background: "#143e33",
        color: "#eef8f1",
        padding: "34px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 44 }}>
        ◈ FamilyGuard
      </div>
      <div
        style={{
          fontSize: 12,
          letterSpacing: 2,
          color: "#a5c5b1",
          marginBottom: 18,
        }}
      >
        FAMILY SPACE
      </div>
      {[
        "Overview",
        "Screen time",
        "Rules & safety",
        "Child experience",
        "Readiness",
      ].map((x) => (
        <div
          key={x}
          style={{
            padding: "15px 10px",
            margin: "5px 0",
            background: x === section ? "#2d5b49" : "transparent",
            borderRadius: 10,
            fontSize: 16,
            color: x === section ? "white" : "#bad0c3",
          }}
        >
          {x}
        </div>
      ))}
      <div
        style={{
          marginTop: 75,
          fontSize: 12,
          lineHeight: 1.6,
          color: "#b9d2c3",
        }}
      >
        Built for transparency.
        <br />
        Permissions stay visible.
      </div>
    </aside>
    <main style={{ flex: 1, padding: "30px 36px", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 25,
        }}
      >
        <span style={{ fontSize: 14, color: colors.muted }}>
          PATEL FAMILY / ANDROID
        </span>
        <Tag warn>UI PROTOTYPE · SYNTHETIC DATA</Tag>
      </div>
      <h1
        style={{
          fontSize: 40,
          lineHeight: 1.1,
          letterSpacing: -1.3,
          margin: "0 0 10px",
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: 17, color: colors.muted, margin: "0 0 25px" }}>
        {subtitle}
      </p>
      {children}
    </main>
  </div>
);

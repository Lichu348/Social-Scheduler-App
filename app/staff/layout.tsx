import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Staff Portal - ShiftFlow",
  description: "Mobile-friendly staff portal for shift management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

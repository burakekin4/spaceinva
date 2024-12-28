export const metadata = {
  title: "Space Invaders",
  description: "Phaser ve Next.js kullanarak Space Invaders oyunu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

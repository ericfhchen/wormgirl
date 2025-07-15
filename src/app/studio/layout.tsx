export const metadata = {
  title: 'Worm Girl Studio',
  description: 'Content Management Studio',
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen">
      {children}
    </div>
  )
} 
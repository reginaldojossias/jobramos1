interface HeaderProps {
  title: string
  subtitle: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold underline decoration-sidebar-accent decoration-2 underline-offset-4">
        {title}
      </h1>
      <p className="text-sm text-sidebar-accent">{subtitle}</p>
    </div>
  )
}

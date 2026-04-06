interface SectionTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function SectionTitle({ title, subtitle, icon }: SectionTitleProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        {icon && <span className="text-gold text-xl">{icon}</span>}
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
      </div>
      {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
    </div>
  );
}

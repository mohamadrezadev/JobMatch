export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <i aria-hidden="true" className={`${name.startsWith('brands:') ? 'fa-brands' : name.startsWith('regular:') ? 'fa-regular' : 'fa-solid'} fa-${name.replace(/^(brands:|regular:)/, '')} ${className}`} />;
}

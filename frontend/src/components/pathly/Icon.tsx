import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  CircleHelp,
  CircleUserRound,
  Clock,
  Compass,
  Download,
  FileText,
  GraduationCap,
  History,
  Layers,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TriangleAlert,
  TrendingUp,
  UserRound,
  X,
  Bot,
  Hand,
} from "lucide-react";
const icons = {
  comments: MessageCircle,
  comment: MessageCircle,
  robot: Bot,
  briefcase: BriefcaseBusiness,
  "chart-line": TrendingUp,
  "file-lines": FileText,
  user: UserRound,
  "user-circle": CircleUserRound,
  sliders: Settings2,
  "wand-magic-sparkles": Sparkles,
  sparkles: Sparkles,
  compass: Compass,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-down": ArrowDown,
  "arrow-up-right-from-square": ArrowUpRight,
  "paper-plane": Send,
  sun: Sun,
  moon: Moon,
  "circle-half-stroke": Sun,
  "right-from-bracket": LogOut,
  "magnifying-glass": Search,
  "circle-check": CircleCheck,
  check: Check,
  "triangle-exclamation": TriangleAlert,
  "location-dot": MapPin,
  "map-marker-alt": MapPin,
  "clock-rotate-left": History,
  clock: Clock,
  trash: Trash2,
  xmark: X,
  "rotate-right": RefreshCw,
  "arrows-rotate": RefreshCw,
  download: Download,
  print: Printer,
  "hand-pointer": Hand,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  "layer-group": Layers,
  target: Target,
  award: Award,
  envelope: Mail,
  "shield-halved": ShieldCheck,
  bars: Menu,
  plus: Plus,
  route: Compass,
} as const;
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  if (name.startsWith("brands:"))
    return (
      <i
        aria-hidden="true"
        className={`fa-brands fa-${name.slice(7)} ${className}`}
      />
    );
  const Graphic =
    icons[name.replace(/^regular:/, "") as keyof typeof icons] ?? CircleHelp;
  return (
    <Graphic
      aria-hidden="true"
      focusable="false"
      strokeWidth={1.8}
      className={`inline-block h-[1em] w-[1em] shrink-0 align-middle ${className}`}
    />
  );
}

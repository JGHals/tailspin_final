declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
  }

  export type Icon = FC<IconProps>;

  export const ArrowLeft: Icon;
  export const Trophy: Icon;
  export const BookOpen: Icon;
  export const Badge: Icon;
  export const User: Icon;
  export const Loader2: Icon;
  export const Share2: Icon;
  export const ChevronRight: Icon;
  export const AlertCircle: Icon;
  export const RefreshCw: Icon;
} 
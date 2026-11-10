import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CalendarCheck,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleEllipsis,
  CircleMinus,
  Cloud,
  Contrast,
  Download,
  ListTree,
  Menu,
  PanelsTopLeft,
  SquarePlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '../../../../../src/marketing/icon-shapes'

/**
 * The lucide-react component of each icon that the site draws from its
 * shapes, so that the mockups draw the same icons as the site.
 */
export const siteIcons: Readonly<Record<IconName, LucideIcon>> = {
  cloud: Cloud,
  users: Users,
  'list-tree': ListTree,
  'square-plus': SquarePlus,
  'panels-top-left': PanelsTopLeft,
  archive: Archive,
  'circle-check': CircleCheck,
  contrast: Contrast,
  'circle-dashed': CircleDashed,
  'arrow-right-left': ArrowRightLeft,
  'circle-ellipsis': CircleEllipsis,
  'circle-minus': CircleMinus,
  'calendar-check': CalendarCheck,
  'arrow-right': ArrowRight,
  download: Download,
  menu: Menu,
  'chevron-down': ChevronDown,
  'arrow-left': ArrowLeft,
}

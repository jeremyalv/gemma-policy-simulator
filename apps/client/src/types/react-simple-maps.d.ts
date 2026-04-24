/**
 * Minimal type shim for react-simple-maps.
 * Replace with @types/react-simple-maps if a community package becomes available.
 */
declare module 'react-simple-maps' {
  import type { ReactNode, CSSProperties, MouseEvent } from 'react'

  export interface GeographyRecord {
    rsmKey: string
    id: string
    properties: Record<string, unknown>
    geometry: unknown
  }

  export interface ComposableMapProps {
    projection?: string
    width?: number
    height?: number
    style?: CSSProperties
    children?: ReactNode
  }

  export interface ZoomableGroupProps {
    zoom?: number
    center?: [number, number]
    children?: ReactNode
  }

  export interface GeographiesProps {
    geography: string
    children: (args: { geographies: GeographyRecord[] }) => ReactNode
  }

  export interface GeographyProps {
    geography: GeographyRecord
    key?: string
    fill?: string
    fillOpacity?: number
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: CSSProperties
      hover?: CSSProperties
      pressed?: CSSProperties
    }
    onMouseEnter?: (e: MouseEvent<SVGPathElement>) => void
    onMouseLeave?: (e: MouseEvent<SVGPathElement>) => void
  }

  export const ComposableMap: React.FC<ComposableMapProps>
  export const ZoomableGroup: React.FC<ZoomableGroupProps>
  export const Geographies: React.FC<GeographiesProps>
  export const Geography: React.FC<GeographyProps>
}
